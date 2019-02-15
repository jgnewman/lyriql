const assert = require("assert")
const sinon = require("sinon")
const handleGraph = require("../src/handle-graph")

describe("handleGraph", function() {
  describe("#handleGraph", function() {
    beforeEach(function() {
      this.graph = ["fakeCall"]
      this.types = {}
      this.queries = {
        fakeCall: {
          type: "String",
          resolve: async () => "hello"
        }
      },
      this.req = {}
    })

    context("when the provided graph is not an array", function() {
      it("returns an error", async function() {
        const result = await handleGraph(null, this.types, this.queries, this.req)
        assert.ok(result.hasOwnProperty("errors"))
      })
    })

    context("when the provided graph is not an array", function() {
      it("returns an error", async function() {
        const result = await handleGraph(null, this.types, this.queries, this.req)
        assert.ok(result.hasOwnProperty("errors"))
      })
    })

    context("when the provided graph doesn't contain a valid call name", function() {
      it("returns an error", async function() {
        const result = await handleGraph([], this.types, this.queries, this.req)
        assert.ok(result.hasOwnProperty("errors"))
      })
    })

    context("when the provided graph doesn't contain a defined call name", function() {
      it("returns an error", async function() {
        const result = await handleGraph(["wrong"], this.types, this.queries, this.req)
        assert.ok(result.hasOwnProperty("errors"))
      })
    })

    context("when the call is ::compose", function() {
      it("returns a data array", async function() {
        const result = await handleGraph(["::compose", "fakeCall", "fakeCall"], this.types, this.queries, this.req)
        assert.ok(result.hasOwnProperty("data"))
        assert.ok(Array.isArray(result.data))
        assert.ok(result.data.length === 2)
        assert.equal(result.data[0].fakeCall, "hello")
        assert.equal(result.data[1].fakeCall, "hello")
      })
    })

    context("when the a graph child item is in a bad format", function() {
      it("returns an error", async function() {
        const badFormat = null
        const result = await handleGraph(["fakeCall", {}, badFormat], this.types, this.queries, this.req)
        assert.ok(result.hasOwnProperty("errors"))
      })
    })

    context("when requesting a native data type", function() {
      context("when the data does not match the native type", function() {
        it("returns an error", async function() {
          this.queries.fakeCall.type = "Number"
          const result = await handleGraph(this.graph, this.types, this.queries, this.req)
          assert.ok(result.hasOwnProperty("errors"))
        })
      })

      context("when the data matches the native type", function() {
        it("returns a the data", async function() {
          const result = await handleGraph(this.graph, this.types, this.queries, this.req)
          assert.ok(result.hasOwnProperty("data"))
          assert.equal(result.data.fakeCall, "hello")
        })
      })
    })

    context("when requesting a custom data type", function() {
      beforeEach(function() {
        this.graph = ["fakeCall", {}, "foo", "bar"]
        this.types = {
          MyType: {
            foo: { type: "String", resolve: async ({ data }) => data.foo },
            bar: { type: "String", resolve: async ({ data }) => data.bar },
          }
        }
        this.queries = {
          fakeCall: {
            type: "MyType",
            resolve: async () => ({ foo: "foo", bar: "bar" })
          }
        }
        this.req = {}
      })

      context("when the custom type is not valid", function() {
        it("returns an error", async function() {
          this.queries.fakeCall.type = "NonExistantCustomType"
          const result = await handleGraph(this.graph, this.types, this.queries, this.req)
          assert.ok(result.hasOwnProperty("errors"))
        })
      })

      context("when the graph does not request children", function() {
        it("returns an error", async function() {
          this.graph = ["fakeCall"]
          const result = await handleGraph(this.graph, this.types, this.queries, this.req)
          assert.ok(result.hasOwnProperty("errors"))
        })
      })

      context("when the expects to return an array but the data is not an array", function() {
        it("returns an error", async function() {
          this.queries = {
            fakeCall: {
              type: ["MyType"],
              resolve: async () => ({ foo: "foo", bar: "bar" })
            }
          }
          const result = await handleGraph(this.graph, this.types, this.queries, this.req)
          assert.ok(result.hasOwnProperty("errors"))
        })
      })

      context("when the call is valid", function() {
        it("returns a the data correctly", async function() {
          const result = await handleGraph(this.graph, this.types, this.queries, this.req)
          assert.ok(result.hasOwnProperty("data"))
          assert.deepEqual(result.data, {
            fakeCall: {
              foo: "foo",
              bar: "bar",
            }
          })
        })

        context("when something goes wrong collecting a particular item", function() {
          it("collects the error but still returns data", async function() {
            this.types.MyType.bar.resolve = async () => { throw new Error("failed") }
            const result = await handleGraph(this.graph, this.types, this.queries, this.req)
            assert.ok(result.hasOwnProperty("data"))
            assert.ok(result.hasOwnProperty("errors"))
            assert.deepEqual(result, {
              data: {
                fakeCall: {
                  foo: "foo",
                  bar: null,
                },
              },
              errors: [
                ["bar", "failed"],
              ],
            })
          })
        })

        context("when the data is an array", function() {
          it("returns a the data correctly", async function() {
            this.queries = {
              fakeCall: {
                type: ["MyType"],
                resolve: async () => [{ foo: "foo", bar: "bar" }, { foo: "foo", bar: "bar" }]
              }
            }
            const result = await handleGraph(this.graph, this.types, this.queries, this.req)
            assert.ok(result.hasOwnProperty("data"))
            assert.deepEqual(result.data, {
              fakeCall: [
                {
                  foo: "foo",
                  bar: "bar",
                },
                {
                  foo: "foo",
                  bar: "bar",
                },
              ]
            })
          })
        })
      })

      context("when the graph contains ::when", function() {
        it("conditionally returns data", async function() {
          this.graph = ["fakeCall", {}, "foo", ["::when", {nql: ["foo", "foo"]}, "bar"]]
          const result = await handleGraph(this.graph, this.types, this.queries, this.req)
          assert.ok(result.hasOwnProperty("data"))
          assert.deepEqual(result.data, {
            fakeCall: {
              foo: "foo",
            }
          })
        })
      })

    })

  })
})
