const assert = require('assert')
const RequestHandler = require('../src/request-handler')
const { Expecter, Demander, OK } = require('../src/validators')

describe('request-handler', function () {
  describe('#constructor', function () {
    it('creates the expected default properties', function () {
      const handler = new RequestHandler(
        '{ foo }',
        { Root: {} },
        { bar: 'bar' }
      )
      assert.equal(handler.requestText, '{ foo }')
      assert.deepEqual(handler.spec, { Root: {} })
      assert.deepEqual(handler.requestContext, { request: { bar: 'bar' } })
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
      this.specChunk = {
        'foo': { params: { a: new Expecter(String), b: new Expecter(String) } }
      }
      this.data = 'foo'
    })

    context('when params are valid', function () {
      it('returns an object with data and params', function () {
        const handler = new RequestHandler()
        const result = handler.buildLocalContext(this.node, this.specChunk, this.data)
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
          handler.buildLocalContext(this.node, this.specChunk, this.data)
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
      this.query = '{ foo { name } }'
      this.node = {
        label: 'foo',
        params: {},
        body: [
          {
            label: 'name',
            params: {},
            body: []
          }
        ]
      }
      this.spec = {
        Root: {
          foo: {
            type: new Expecter('Person'),
            resolve: () => ({ name: 'foo' })
          }
        },
        Person: {
          name: {
            type: new Expecter(String),
            resolve: ({ data }) => data.name
          }
        }
      }
    })

    context('when everything matches', function () {
      it('resolves the data', async function () {
        const handler = new RequestHandler(this.query, this.spec)
        const result = await handler.resolveNode(this.node)
        assert.deepEqual(result, { name: 'foo' })
      })
    })

    context('when the required spec chunk is not found in the spec', function () {
      it('throws an error', async function () {
        const handler = new RequestHandler(this.query, this.spec)
        await assert.rejects(async () => {
          return await handler.resolveNode(this.node, new Demander('Extra'))
        })
      })
    })

    context('when a requested field is not found in the spec chunk', function () {
      it('throws an error', async function () {
        this.query = 'bar'
        this.node.label = 'bar'
        const handler = new RequestHandler(this.query, this.spec)
        await assert.rejects(async () => {
          return handler.resolveNode(this.node)
        })
      })
    })

    context('when a resolved piece of data does not match the expected type', function () {
      it('throws an error', async function () {
        this.spec.Root.foo.resolve = () => 123;
        const handler = new RequestHandler(this.query, this.spec)
        await assert.rejects(async () => {
          const out = await handler.resolveNode(this.node)
        })
      })
    })

    context('when the user did not provide a block for formatting an array of objects', function () {
      it('throws an error', async function () {
        this.query = '{ foo }'
        this.node = { label: 'foo', params: {}, body: [] }
        this.spec.Root.foo.type = new Expecter([ new Expecter('Person') ])
        this.spec.Root.foo.resolve = () => [{ name: 'foo' }, { name: 'bar' }];
        const handler = new RequestHandler(this.query, this.spec)
        await assert.rejects(async () => {
          const out = await handler.resolveNode(this.node)
        })
      })
    })

    context('when the user did not provide a block for formatting an object with a spec type', function () {
      it('throws an error', async function () {
        this.query = '{ foo }'
        this.node = { label: 'foo', params: {}, body: [] }
        const handler = new RequestHandler(this.query, this.spec)
        await assert.rejects(async () => {
          const out = await handler.resolveNode(this.node)
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
      this.spec = {
        Root: {
          foo: {
            type: new Expecter(String),
            resolve: () => 'foo'
          }
        }
      }
    })

    context('when there are no errors', function () {
      it('returns an object with a data property', async function () {
        const handler = new RequestHandler(this.query, this.spec)
        handler.resolveNode = async () => Promise.resolve('foo');
        const result = await handler.resolveRequest()
        assert.deepEqual(result, { data: 'foo' })
      })
    })

    context('when there are errors', function () {
      it('returns an object with an error property', async function () {
        const handler = new RequestHandler(this.query, this.spec)
        handler.resolveNode = async () => Promise.reject('foo');
        const result = await handler.resolveRequest()
        assert.deepEqual(result, { error: 'foo' })
      })
    })
  })
})
