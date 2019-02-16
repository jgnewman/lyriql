const assert = require("assert")
const ensure = require("../src/ensure")

describe("ensure", function() {

  describe("#valueIsArray", function() {
    context("when given an array", function() {
      it("does not throw an error", function() {
        assert.doesNotThrow(() => ensure.valueIsArray([]))
      })
    })

    context("when given a non-array", function() {
      it("throws an error", function() {
        assert.throws(() => ensure.valueIsArray({}), { name: /^Error$/ })
      })
    })
  })

  describe("#valueIsCallName", function() {
    context("when given a string", function() {
      context("when the string is populated", function() {
        it("does not throw an error", function() {
          assert.doesNotThrow(() => ensure.valueIsCallName("foo"))
        })
      })

      context("when the string is empty", function() {
        it("throws an error", function() {
          assert.throws(() => ensure.valueIsCallName(""), { name: /^Error$/ })
        })
      })
    })

    context("when given a non-string", function() {
      it("throws an error", function() {
        assert.throws(() => ensure.valueIsCallName([]), { name: /^Error$/ })
      })
    })
  })

  describe("#valueIsAllowedQueryName", function() {
    beforeEach(function() {
      this.allowedQueries = { foo: () => {}, bar: () => {} }
    })

    context("when given an allowed query name", function() {
      it("does not throw an error", function() {
        assert.doesNotThrow(() => ensure.valueIsAllowedQueryName("foo", this.allowedQueries))
      })
    })

    context("when given an allowed metagraph name", function() {
      it("does not throw an error", function() {
        assert.doesNotThrow(() => ensure.valueIsAllowedQueryName("::compose", this.allowedQueries))
        assert.doesNotThrow(() => ensure.valueIsAllowedQueryName("::when", this.allowedQueries))
      })
    })

    context("when given a non-allowed query name", function() {
      it("throws an error", function() {
        assert.throws(() => ensure.valueIsAllowedQueryName("wrong", this.allowedQueries), { name: /^Error$/ })
      })
    })
  })

  describe("#typeNameIsValidCustomType", function() {
    beforeEach(function() {
      this.types = { Foo: {}, Bar: {} }
    })

    context("when given a valid custom type", function() {
      it("does not throw an error", function() {
        assert.doesNotThrow(() => ensure.typeNameIsValidCustomType("Foo", this.types))
      })
    })

    context("when given a non-valid custom type", function() {
      it("throws an error", function() {
        assert.throws(() => ensure.typeNameIsValidCustomType("wrong", this.types), { name: /^Error$/ })
      })
    })
  })

  describe("#graphHasChildren", function() {
    context("when given a valid array", function() {
      it("does not throw an error", function() {
        assert.doesNotThrow(() => ensure.graphHasChildren(["foo", "bar"]))
      })
    })

    context("when given an empty array", function() {
      it("throws an error", function() {
        assert.throws(() => ensure.graphHasChildren([]), { name: /^Error$/ })
      })
    })

    context("when given some non-array value", function() {
      it("throws an error", function() {
        assert.throws(() => ensure.graphHasChildren({length: 10}), { name: /^Error$/ })
      })
    })
  })

  describe("#childTypeOk", function() {
    context("when given a string", function() {
      it("does not throw an error", function() {
        assert.doesNotThrow(() => ensure.childTypeOk("foo"))
      })
    })

    context("when given an array", function() {
      it("does not throw an error", function() {
        assert.doesNotThrow(() => ensure.childTypeOk(["foo"]))
      })
    })

    context("when given a non-string/array", function() {
      it("throws an error", function() {
        assert.throws(() => ensure.childTypeOk({}), { name: /^Error$/ })
      })
    })
  })

  describe("#dataMatchesNativeType", function() {
    beforeEach(function() {
      this.data = "example"
      this.typeObject = { name: "String", isArray: false, isRequired: false }
      this.childrenRequested = false
    })

    context("when everything is valid", function() {
      it("does not throw an error", function() {
        assert.doesNotThrow(() => ensure.dataMatchesNativeType(this.data, this.typeObject, this.childrenRequested))
      })
    })

    context("when children are requested on a native type", function() {
      it("throws an error", function() {
        this.childrenRequested = true
        assert.throws(() => ensure.dataMatchesNativeType(this.data, this.typeObject, this.childrenRequested), { name: /^Error$/ })
      })
    })

    context("when the data type does not expect an array of native types", function() {
      context("when the data is null", function() {
        context("when the data is required", function() {
          it("throws an error", function() {
            this.data = null
            this.typeObject.isRequired = true
            assert.throws(() => ensure.dataMatchesNativeType(this.data, this.typeObject, this.childrenRequested), { name: /^Error$/ })
          })
        })

        context("when the data is not required", function() {
          it("does not throw an error", function() {
            assert.doesNotThrow(() => ensure.dataMatchesNativeType(this.data, this.typeObject, this.childrenRequested))
          })
        })
      })

      context("when the data is not null", function() {
        context("when the data does not match an allowed native type", function() {
          it("throws an error", function() {
            this.data = []
            assert.throws(() => ensure.dataMatchesNativeType(this.data, this.typeObject, this.childrenRequested), { name: /^Error$/ })
          })
        })
      })
    })

    context("when the data type expects an array of native types", function() {
      beforeEach(function() {
        this.data = ["example1", "example2"]
        this.typeObject = { name: "String", isArray: true, isRequired: false }
        this.childrenRequested = false
      })

      context("when the data is not an array", function() {
        it("throws an error", function() {
          this.data = "not array"
          assert.throws(() => ensure.dataMatchesNativeType(this.data, this.typeObject, this.childrenRequested), { name: /^Error$/ })
        })
      })

      context("when the data is not an array", function() {
        it("throws an error", function() {
          this.data = "not array"
          assert.throws(() => ensure.dataMatchesNativeType(this.data, this.typeObject, this.childrenRequested), { name: /^Error$/ })
        })
      })

      context("when one of the data values does not match the expected type", function() {
        it("throws an error", function() {
          this.data = ["string", 100, "string"]
          assert.throws(() => ensure.dataMatchesNativeType(this.data, this.typeObject, this.childrenRequested), { name: /^Error$/ })
        })
      })
    })
  })

  describe("#argsOk", function() {
    beforeEach(function() {
      this.args = { foo: "foo" }
      this.expected = { foo: "String" }
    })

    it("does not throw an error", function() {
      assert.doesNotThrow(() => ensure.argsOk(this.args, this.expected))
    })

    context("when there are no expectations for arg types", function() {
      it("does not throw an error", function() {
        this.expected = {}
        assert.doesNotThrow(() => ensure.argsOk(this.args, this.expected))
      })
    })

    context("when args aren't in the format of an object", function() {
      it("throws an error", function() {
        this.args = "foo"
        assert.throws(() => ensure.argsOk(this.args, this.expected), { name: /^Error$/ })
      })
    })

    context("when an expected argument is missing", function() {
      it("throws an error", function() {
        this.args = {bar: "bar"}
        assert.throws(() => ensure.argsOk(this.args, this.expected), { name: /^Error$/ })
      })
    })

    context("when a required argument is null", function() {
      it("throws an error", function() {
        this.expected = { foo: "String!" }
        this.args = { foo: null }
        assert.throws(() => ensure.argsOk(this.args, this.expected), { name: /^Error$/ })
      })
    })

    context("when an expected type is an array", function() {
      beforeEach(function() {
        this.expected = { foo: ["String"] }
      })

      context("when the associated argument is not an array", function() {
        it("throws an error", function() {
          this.args = {foo: "foo"}
          assert.throws(() => ensure.argsOk(this.args, this.expected), { name: /^Error$/ })
        })
      })

      context("when the a value in the associated array is of the wrong type", function() {
        it("throws an error", function() {
          this.args = {foo: [123]}
          assert.throws(() => ensure.argsOk(this.args, this.expected), { name: /^Error$/ })
        })
      })
    })

    context("when an expected type is not an array", function() {
      context("when an argument does not match the native type", function() {
        it("throws an error", function() {
          this.args = {foo: 123}
          assert.throws(() => ensure.argsOk(this.args, this.expected), { name: /^Error$/ })
        })
      })
    })
  })

})
