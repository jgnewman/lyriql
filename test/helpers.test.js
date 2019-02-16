const assert = require("assert")
const helpers = require("../src/helpers")

describe("helpers", function() {

  describe("#isPlainObject", function() {
    context("when given a plain object", function() {
      it("returns true", function() {
        assert.equal(helpers.isPlainObject({}), true)
      })
    })

    context("when given anything else", function() {
      it("returns false", function() {
        assert.equal(helpers.isPlainObject("string"), false)
        assert.equal(helpers.isPlainObject([]), false)
        assert.equal(helpers.isPlainObject(null), false)
      })
    })
  })

  describe("#isAllowedNativeType", function() {
    context("when given an allowed native type", function() {
      it("returns true", function() {
        assert.equal(helpers.isAllowedNativeType("Object"), true)
        assert.equal(helpers.isAllowedNativeType("String"), true)
        assert.equal(helpers.isAllowedNativeType("Number"), true)
        assert.equal(helpers.isAllowedNativeType("Boolean"), true)
      })
    })

    context("when given anything else", function() {
      it("returns false", function() {
        assert.equal(helpers.isAllowedNativeType("Array"), false)
      })
    })
  })

  describe("#objectLoop", function() {
    it("calls an iterator once for every key in an object", function() {
      const begin = {foo: 1, bar: 2}
      const end = {}
      helpers.objectLoop(begin, (val, key) => end[key] = val)
      assert.deepEqual(begin, end)
    })
  })

  describe("#valueMatchesAllowedNativeType", function() {
    context("when the value is an object type", function() {
      context("when an object is expected", function() {
        context("when the value is a plain object", function() {
          it("returns true", function() {
            assert.equal(helpers.valueMatchesAllowedNativeType({}, "Object"), true)
          })
        })

        context("when the value is not a plain object", function() {
          it("returns false", function() {
            assert.equal(helpers.valueMatchesAllowedNativeType(null, "Object"), false)
          })
        })
      })

      context("when an object is not expected", function() {
        it("returns false", function() {
          assert.equal(helpers.valueMatchesAllowedNativeType({}, "String"), false)
        })
      })
    })

    context("when the value is a non-object type", function() {
      context("when the value type matches the expected type", function() {
        it("returns true", function() {
          assert.equal(helpers.valueMatchesAllowedNativeType("string", "String"), true)
        })
      })

      context("when the value type does not match the expected type", function() {
        it("returns false", function() {
          assert.equal(helpers.valueMatchesAllowedNativeType(123, "String"), false)
        })
      })
    })
  })

  describe("#buildTypeObject", function() {
    context("when the type is an array", function () {
      it("sets `isArray` to true", function() {
        const result = helpers.buildTypeObject(["String"])
        assert.equal(result.isArray, true)
      })
    })

    context("when the type is not an array", function () {
      it("sets `isArray` to false", function() {
        const result = helpers.buildTypeObject("String")
        assert.equal(result.isArray, false)
      })
    })

    context("when the type is required", function () {
      it("sets `isRequired` to true", function() {
        const result = helpers.buildTypeObject("String!")
        assert.equal(result.isRequired, true)
      })

      it("removes `!` from the name of the type", function() {
        const result = helpers.buildTypeObject("String!")
        assert.equal(result.name, "String")
      })
    })

    context("when the type is required inside an array", function () {
      it("sets `isRequired` to true", function() {
        const result = helpers.buildTypeObject(["String!"])
        assert.equal(result.isRequired, true)
      })

      it("removes `!` from the name of the type", function() {
        const result = helpers.buildTypeObject(["String!"])
        assert.equal(result.name, "String")
      })
    })

    context("when the type is not required", function () {
      it("sets `isRequired` to false", function() {
        const result = helpers.buildTypeObject("String")
        assert.equal(result.isRequired, false)
      })
    })

    context("when the type is an allowed native type", function () {
      it("sets `isNative` to true", function() {
        const result = helpers.buildTypeObject("String")
        assert.equal(result.isNative, true)
      })
    })

    context("when the type is not an allowed native type", function () {
      it("sets `isNative` to false", function() {
        const result = helpers.buildTypeObject("NotNative")
        assert.equal(result.isNative, false)
      })
    })
  })

})
