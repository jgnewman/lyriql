const assert = require('assert')
const { Expecter, Demander, Validate, OK } = require('../src/validators')

describe('validators', function () {

  describe('OK', function () {
    it('is a symbol', function () {
      assert.equal(typeof OK, 'symbol')
    })

    it('is a predictable symbol', function () {
      assert.equal(OK, Symbol.for('HARKERQL_OK_SYMBOL'))
    })
  })

  describe('Expecter', function () {
    beforeEach(function () {
      this.node = { label: 'foo' }
    })

    describe('#constructor', function () {
      context('when given a native type constructor', function () {
        it('recognizes itself as a native type checker', function () {
          const validator = new Expecter(String)
          assert.equal(validator.isNative, true)
        })
      })

      context('when not given a native type constructor', function () {
        it('recognizes itself as a non-native type checker', function () {
          const validator = new Expecter('Foo')
          assert.equal(validator.isNative, false)
        })
      })

      context('when given an array', function () {
        it('recognizes itself as an array validator', function () {
          const validator = new Expecter([])
          assert.equal(validator.isArray, true)
        })
      })
    })

    describe('#validate', function () {
      context('when validating null', function () {
        it('returns OK', function () {
          const validator = new Expecter()
          assert.equal(validator.validate(this.node, null), OK)
        })
      })

      context('when validating with a native constructor', function () {
        it('returns OK if the value matches the type', function () {
          const validator = new Expecter(String)
          assert.equal(validator.validate(this.node, 'foo'), OK)
        })

        it('returns an error string if the value does not match the type', function () {
          const validator = new Expecter(String)
          assert.ok(/does not match type/.test(validator.validate(this.node, 123)))
        })
      })

      context('when validating with an array', function () {
        it('returns OK if the value is an array', function () {
          const validator = new Expecter([])
          assert.equal(validator.validate(this.node, ['foo']), OK)
        })

        it('returns an error string if the value is not an array', function () {
          const validator = new Expecter([])
          assert.ok(/does not match type/.test(validator.validate(this.node, 123)))
        })
      })
    })
  })

  describe('Demander', function () {
    beforeEach(function () {
      this.node = { label: 'foo' }
    })

    context('when evaluating null', function () {
      it('returns an error string', function () {
        const validator = new Demander(String)
        assert.ok(/null for type/.test(validator.validate(this.node, null)))
      })
    })
  })

  describe('Validate', function () {
    describe('#validParams', function () {
      beforeEach(function () {
        this.node = { label: 'foo' }
      })

      context('valid conditions', function () {
        it('no params in schema and no params provided', function () {
          this.node.params = {}
          const schema = {}
          const result = Validate.validParams(this.node, schema)
          assert.equal(result, OK)
        })

        it('params provided match params in schema', function () {
          this.node.params = {a: 'a', b: 123}
          const schema = { params: { a: new Expecter(String), b: new Expecter(Number) } }
          const result = Validate.validParams(this.node, schema)
          assert.equal(result, OK)
        })
      })

      context('invalid conditions', function () {
        it('no params in schema but params provided', function () {
          this.node.params = {a: 'a', b: 123}
          const schema = {}
          const result = Validate.validParams(this.node, schema)
          assert.ok(/unexpected parameters provided/i.test(result))
        })

        it('params exist in schema but no params provided', function () {
          this.node.params = {}
          const schema = { params: { a: new Expecter(String), b: new Expecter(Number) } }
          const result = Validate.validParams(this.node, schema)
          assert.ok(/wrong number of parameters provided/i.test(result))
        })

        it('number of params provided does not match schema', function () {
          this.node.params = {a: 'a', b: 123, c: null}
          const schema = { params: { a: new Expecter(String), b: new Expecter(Number) } }
          const result = Validate.validParams(this.node, schema)
          assert.ok(/wrong number of parameters provided/i.test(result))
        })

        it('an unexpected parameter is provided', function () {
          this.node.params = {a: 'a', c: 123}
          const schema = { params: { a: new Expecter(String), b: new Expecter(Number) } }
          const result = Validate.validParams(this.node, schema)
          assert.ok(/unexpected parameter/i.test(result))
        })

        it('an provided parameter is of the wrong type', function () {
          this.node.params = {a: 'a', b: 'b'}
          const schema = { params: { a: new Expecter(String), b: new Expecter(Number) } }
          const result = Validate.validParams(this.node, schema)
          assert.ok(/value for parameter/i.test(result))
        })
      })
    })

    describe('#specInSchema', function () {
      beforeEach(function () {
        this.schema = { Foo: {} }
      })

      context('when an expecter wants a native value', function () {
        it('returns OK', function () {
          const expecter = new Expecter(String)
          const result = Validate.specInSchema(expecter, this.schema)
          assert.equal(result, OK)
        })
      })

      context('when the expected value exists in the schema', function () {
        it('returns OK', function () {
          const expecter = new Expecter('Foo')
          const result = Validate.specInSchema(expecter, this.schema)
          assert.equal(result, OK)
        })
      })

      context('when the expected value does not exist in the schema', function () {
        it('returns an error string', function () {
          const expecter = new Expecter('Bar')
          const result = Validate.specInSchema(expecter, this.schema)
          assert.ok(/does not contain/.test(result))
        })
      })
    })

    describe('#specInResolver', function () {
      beforeEach(function () {
        this.resolver = { Foo: {} }
      })

      context('when an expecter wants a native value', function () {
        it('returns OK', function () {
          const expecter = new Expecter(String)
          const result = Validate.specInResolver(expecter, this.resolver)
          assert.equal(result, OK)
        })
      })

      context('when the expected value exists in the resolver', function () {
        it('returns OK', function () {
          const expecter = new Expecter('Foo')
          const result = Validate.specInResolver(expecter, this.resolver)
          assert.equal(result, OK)
        })
      })

      context('when the expected value does not exist in the resolver', function () {
        it('returns an error string', function () {
          const expecter = new Expecter('Bar')
          const result = Validate.specInResolver(expecter, this.resolver)
          assert.ok(/does not contain/.test(result))
        })
      })
    })

    describe('#fieldInSchema', function () {
      beforeEach(function () {
        this.node = { label: 'foo' }
        this.schema = { foo: new Demander(String) }
      })

      context('when a query field exists in a resolver', function () {
        it('returns ok', function () {
          const result = Validate.fieldInSchema(this.node, this.schema)
          assert.equal(result, OK)
        })
      })

      context('when a query field does not exist in a resolver', function () {
        it('returns an error string', function () {
          this.node.label = 'bar'
          const result = Validate.fieldInSchema(this.node, this.schema)
          assert.ok(/does not exist/.test(result))
        })
      })
    })

    describe('#fieldInResolver', function () {
      beforeEach(function () {
        this.node = { label: 'foo' }
        this.resolver = { foo: () => {} }
      })

      context('when a query field exists in a resolver', function () {
        it('returns ok', function () {
          const result = Validate.fieldInResolver(this.node, this.resolver)
          assert.equal(result, OK)
        })
      })

      context('when a query field does not exist in a resolver', function () {
        it('returns an error string', function () {
          this.node.label = 'bar'
          const result = Validate.fieldInResolver(this.node, this.resolver)
          assert.ok(/does not exist/.test(result))
        })
      })
    })

    describe('#dataMatchesType', function () {
      beforeEach(function () {
        this.node = { label: 'foo' }
      })

      context('when raw data matches the expected type', function () {
        it('returns OK', function () {
          const expecter = new Expecter(String)
          const data = 'foo'
          const result = Validate.dataMatchesType(this.node, data, expecter)
          assert.equal(result, OK)
        })
      })

      context('when raw data does not match the expected type', function () {
        it('returns an error string', function () {
          const expecter = new Expecter(String)
          const data = 123
          const result = Validate.dataMatchesType(this.node, data, expecter)
          assert.ok(/does not match type/.test(result))
        })
      })
    })
  })

})
