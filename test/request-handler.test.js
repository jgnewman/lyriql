const assert = require('assert')
const RequestHandler = require('../src/request-handler')
const { Expecter, Demander, OK } = require('../src/validators')

describe('request-handler', function () {
  describe('#constructor', function () {
    it('creates the expected default properties', function () {
      const handler = new RequestHandler(
        '{ foo }',
        { Root: {} },
        { Root: {} },
        { bar: 'bar' }
      )
      assert.equal(handler.requestText, '{ foo }')
      assert.deepEqual(handler.schema, { Root: {} })
      assert.deepEqual(handler.rootResolver, { Root: {} })
      assert.deepEqual(handler.httpReq, { bar: 'bar' })
      assert.deepEqual(handler.requestContext, { req: { bar: 'bar' } })
    })
  })

  describe('#errorForProblem', function () {
    context('when handed the OK value', function () {
      it('does not throw an error', function () {
        const handler = new RequestHandler()
        assert.doesNotThrow(function () {
          handler.errorForProblem(OK)
        })
      })
    })

    context('when handed anything other than the OK value', function () {
      it('throws an error with the value', function () {
        const handler = new RequestHandler()
        assert.throws(function () {
          handler.errorForProblem('foo')
        }, {
          name: 'Error',
          message: 'foo'
        })
      })
    })
  })

  describe('#buildLocalContext', function () {
    beforeEach(function () {
      this.node = {
        label: 'foo',
        params: { a: 'a', b: 'b' }
      }
      this.schemaChunk = {
        'foo': { params: { a: new Expecter(String), b: new Expecter(String) } }
      }
      this.data = 'foo'
    })

    context('when params are valid', function () {
      it('returns an object with data and params', function () {
        const handler = new RequestHandler()
        const result = handler.buildLocalContext(this.node, this.schemaChunk, this.data)
        assert.deepEqual(result, {
          data: this.data,
          params: this.node.params
        })
      })
    })

    context('when params are not valid', function () {
      it('throws an error', function () {
        const handler = new RequestHandler()
        this.node.params.a = 123
        assert.throws(function () {
          handler.buildLocalContext(this.node, this.schemaChunk, this.data)
        })
      })
    })
  })

  describe('#resolveTypeChecker', function () {
    context('when given an object for a data spec', function () {
      it("returns the object's data property", function () {
        const handler = new RequestHandler()
        const checker = { data: new Expecter(String) }
        const result = handler.resolveTypeChecker(checker)
        assert.equal(result, checker.data)
      })
    })

    context('when given an expecter/demander for a data spec', function () {
      it('returns the expecter/demander', function () {
        const handler = new RequestHandler()
        const checker = new Expecter(String)
        const result = handler.resolveTypeChecker(checker)
        assert.equal(result, checker)
      })
    })
  })

  describe('#resolveNodeBody', function () {
    it('resolves a list of subnodes', async function () {
      const node = { label: 'foo', body: [{label: 'a'}, {label: 'b'}, {label: 'c'}] }
      const handler = new RequestHandler()
      handler.resolveNode = async (...args) => args;

      const result = await handler.resolveNodeBody(node, 'bar', 'baz')
      assert.deepEqual(result, {
        a: [{label: 'a'}, 'bar', 'baz'],
        b: [{label: 'b'}, 'bar', 'baz'],
        c: [{label: 'c'}, 'bar', 'baz']
      })
    })
  })

  describe('#resolveNode', function () {
    beforeEach(function () {
      this.query = '{ foo }'
      this.node = {
        label: 'foo',
        params: {},
        body: []
      }
      this.schema = {
        Root: {
          foo: new Expecter(String)
        }
      }
      this.resolver = {
        Root: {
          foo: () => 'foo'
        }
      }
    })

    context('when everything matches', function () {
      it('resolves the data', async function () {
        const handler = new RequestHandler(this.query, this.schema, this.resolver)
        const result = await handler.resolveNode(this.node)
        assert.equal(result, 'foo')
      })
    })

    context('when the proper spec is not found in the schema', function () {
      it('throws an error', async function () {
        const handler = new RequestHandler(this.query, this.schema, this.resolver)
        this.resolver = { Extra: { bar: new Expecter(String) } }
        await assert.rejects(async () => {
          return await handler.resolveNode(this.node, new Demander('Extra'))
        })
      })
    })

    context('when the proper spec is not found in the resolver', function () {
      it('throws an error', async function () {
        const handler = new RequestHandler(this.query, this.schema, this.resolver)
        this.schema = { Extra: { bar: () => 'bar' } }
        await assert.rejects(async () => {
          return handler.resolveNode(this.node, new Demander('Extra'))
        })
      })
    })

    context('when a requested field is not found in the schema', function () {
      it('throws an error', async function () {
        this.node.label = 'bar'
        this.resolver.Root.bar = () => 'bar';
        const handler = new RequestHandler('{ bar }', this.schema, this.resolver)
        await assert.rejects(async () => {
          return handler.resolveNode(this.node, new Demander('Root'))
        })
      })
    })

    context('when a requested field is not found in the resolver', function () {
      it('throws an error', async function () {
        this.node.label = 'bar'
        this.schema.Root.bar = new Expecter(String);
        const handler = new RequestHandler('{ bar }', this.schema, this.resolver)
        await assert.rejects(async () => {
          return handler.resolveNode(this.node, new Demander('Root'))
        })
      })
    })

    context('when a resolved piece of data does not match the expected type', function () {
      it('throws an error', async function () {
        const handler = new RequestHandler(this.query, this.schema, this.resolver)
        this.resolver.Root.foo = () => 123;
        await assert.rejects(async () => {
          return handler.resolveNode(this.node, new Demander('Root'))
        })
      })
    })
  })

  describe('#resolveRequest', function () {
    beforeEach(function () {
      this.query = '{ foo }'
      this.node = {
        label: 'foo',
        params: {},
        body: []
      }
      this.schema = {
        Root: {
          foo: new Expecter(String)
        }
      }
      this.resolver = {
        Root: {
          foo: () => 'foo'
        }
      }
    })

    context('when there are no errors', function () {
      it('returns an object with a data property', async function () {
        const handler = new RequestHandler(this.query, this.schema, this.resolver)
        handler.resolveNode = async () => Promise.resolve('foo');
        const result = await handler.resolveRequest()
        assert.deepEqual(result, { data: 'foo' })
      })
    })

    context('when there are errors', function () {
      it('returns an object with an error property', async function () {
        const handler = new RequestHandler(this.query, this.schema, this.resolver)
        handler.resolveNode = async () => Promise.reject('foo');
        const result = await handler.resolveRequest()
        assert.deepEqual(result, { error: 'foo' })
      })
    })
  })
})
