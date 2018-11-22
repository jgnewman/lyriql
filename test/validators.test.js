const assert = require('assert')
const { Expecter, Demander, Validate, OK } = require('../src/validators')

describe('validators', function () {

  describe('OK', function () {
    it('is a symbol', function () {
      assert.equal(typeof OK, 'symbol')
    })

    it('is a predictable symbol', function () {
      assert.equal(OK, Symbol.for('LYRIQL_OK_SYMBOL'))
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

      context('when validating with a non-native constructor', function () {
        it('returns an error string if the value has a type other than object', function () {
          const validator = new Expecter('Foo')
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
        it('no params in spec chunk and no params provided', function () {
          this.node.params = {}
          const specChunk = {}
          const result = Validate.validParams(this.node, specChunk)
          assert.equal(result, OK)
        })

        it('params provided match params in spec chunk', function () {
          this.node.params = {a: 'a', b: 123}
          const specChunk = { params: { a: new Expecter(String), b: new Expecter(Number) } }
          const result = Validate.validParams(this.node, specChunk)
          assert.equal(result, OK)
        })
      })

      context('invalid conditions', function () {
        it('no params in spec chunk but params provided', function () {
          this.node.params = {a: 'a', b: 123}
          const specChunk = {}
          const result = Validate.validParams(this.node, specChunk)
          assert.ok(/unexpected params provided/i.test(result))
        })

        it('params exist in spec chunk but no params provided', function () {
          this.node.params = {}
          const specChunk = { params: { a: new Expecter(String), b: new Expecter(Number) } }
          const result = Validate.validParams(this.node, specChunk)
          assert.ok(/wrong number of params provided/i.test(result))
        })

        it('number of params provided does not match spec chunk', function () {
          this.node.params = {a: 'a', b: 123, c: null}
          const specChunk = { params: { a: new Expecter(String), b: new Expecter(Number) } }
          const result = Validate.validParams(this.node, specChunk)
          assert.ok(/wrong number of params provided/i.test(result))
        })

        it('an unexpected parameter is provided', function () {
          this.node.params = {a: 'a', c: 123}
          const specChunk = { params: { a: new Expecter(String), b: new Expecter(Number) } }
          const result = Validate.validParams(this.node, specChunk)
          assert.ok(/unexpected param/i.test(result))
        })

        it('an provided parameter is of the wrong type', function () {
          this.node.params = {a: 'a', b: 'b'}
          const specChunk = { params: { a: new Expecter(String), b: new Expecter(Number) } }
          const result = Validate.validParams(this.node, specChunk)
          assert.ok(/value for param/i.test(result))
        })
      })
    })

    describe('#specTypeExists', function () {
      beforeEach(function () {
        this.spec = { Foo: {} }
      })

      context('when an expecter wants a native value', function () {
        it('returns OK', function () {
          const expecter = new Expecter(String)
          const result = Validate.specTypeExists(expecter, this.spec)
          assert.equal(result, OK)
        })
      })

      context('when the expected value exists in the spec', function () {
        it('returns OK', function () {
          const expecter = new Expecter('Foo')
          const result = Validate.specTypeExists(expecter, this.spec)
          assert.equal(result, OK)
        })
      })

      context('when the expected value does not exist in the spec', function () {
        it('returns an error string', function () {
          const expecter = new Expecter('Bar')
          const result = Validate.specTypeExists(expecter, this.spec)
          assert.ok(/does not contain/.test(result))
        })
      })
    })

    describe('#fieldInSpecChunk', function () {
      beforeEach(function () {
        this.node = { label: 'foo' }
        this.specChunk = { foo: new Demander(String) }
      })

      context('when a query field exists in a resolver', function () {
        it('returns ok', function () {
          const result = Validate.fieldInSpecChunk(this.node, this.specChunk)
          assert.equal(result, OK)
        })
      })

      context('when a query field does not exist in a resolver', function () {
        it('returns an error string', function () {
          this.node.label = 'bar'
          const result = Validate.fieldInSpecChunk(this.node, this.specChunk)
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

    describe('#fieldsRequestedForObjectArray', function () {
      beforeEach(function () {
        this.node = { label: 'foo' }
      })

      context('when the node has subnodes in the body', function () {
        it('returns OK', function () {
          this.node.body = [{}, {}]
          const data = [1, 2]
          const result = Validate.fieldsRequestedForObjectArray(this.node, data)
          assert.equal(result, OK)
        })
      })

      context('when the node has an empty body but the data is not an array of objects', function () {
        it('returns OK', function () {
          this.node.body = []
          const data = [1, 2]
          const result = Validate.fieldsRequestedForObjectArray(this.node, data)
          assert.equal(result, OK)
        })
      })

      context('when the node has an empty body but the data is an array of objects', function () {
        it('returns an error string', function () {
          this.node.body = []
          const data = [{}, {}]
          const result = Validate.fieldsRequestedForObjectArray(this.node, data)
          assert.ok(/requires a block/.test(result))
        })
      })
    })

    describe('#typeDoesNotRequireNodeBody', function () {
      beforeEach(function () {
        this.node = { label: 'foo' }
      })

      context('when the expected type is native', function () {
        it('returns OK', function () {
          const typeChecker = new Expecter(String)
          const result = Validate.typeDoesNotRequireNodeBody(this.node, typeChecker)
          assert.equal(result, OK)
        })
      })

      context('when the expected type is an array', function () {
        it('returns OK', function () {
          const typeChecker = new Expecter([ new Expecter('Foo') ])
          const result = Validate.typeDoesNotRequireNodeBody(this.node, typeChecker)
          assert.equal(result, OK)
        })
      })

      context('when the expected type is a custom spec type', function () {
        it('returns an error string', function () {
          const typeChecker = new Expecter('Foo')
          const result = Validate.typeDoesNotRequireNodeBody(this.node, typeChecker)
          assert.ok(/requires a block/.test(result))
        })
      })
    })

  })

})
