const assert = require("assert")
const sinon = require("sinon")
const { getUI, expressLyriql } = require("../src/index")

describe("express plugin", function() {
  describe("#getUI", function() {
    it("fetches the UI template", async function() {
      const template = await getUI()
      assert.ok(/class="lyriql-ui"/.test(template))
    })
  })

  describe("#expressLyriql", function() {
    beforeEach(function() {
      this.types = { Person: {} }
      this.queries = { person: {} }
      this.options = {}
    })

    it("returns a function", function() {
      assert.ok(typeof expressLyriql(this.types, this.queries, this.options) === "function")
    })

    context("when no types are provided", function() {
      it("throws an error", function() {
        this.types = null
        assert.throws(() => expressLyriql(this.types, this.queries, this.options), { name: /^Error$/ })
      })
    })

    context("when no queries are provided", function() {
      it("throws an error", function() {
        this.queries = null
        assert.throws(() => expressLyriql(this.types, this.queries, this.options), { name: /^Error$/ })
      })
    })

    describe("generated function", function() {
      beforeEach(function() {
        this.req = {
          method: "POST",
          path: "/",
          body: '["fakeQuery"]',
        }
        this.res = {
          setHeader: sinon.spy(),
          send: sinon.spy(),
        }
        this.types = {}
        this.queries = {
          fakeQuery: {
            type: "String",
            resolve: async () => "hello"
          }
        }
        this.options = { ui: true }
      })

      it("works when the request method is POST", async function() {
        const handler = expressLyriql(this.types, this.queries, this.options)
        const result = await handler(this.req, this.res)
        assert.equal(this.res.statusCode, 200)
        assert.deepEqual(this.res.send.args[0][0], { data: { fakeQuery: "hello" } })
      })

      it("works when the request method is GET", async function() {
        this.req.method = "GET"
        this.req.query = { graph: encodeURIComponent(this.req.body) }
        const handler = expressLyriql(this.types, this.queries, this.options)
        const result = await handler(this.req, this.res)
        assert.equal(this.res.statusCode, 200)
        assert.deepEqual(this.res.send.args[0][0], { data: { fakeQuery: "hello" } })
      })

      context("when the request method is not GET or POST", function() {
        it("sets a header", async function() {
          this.req.method = "PUT"
          const handler = expressLyriql(this.types, this.queries, this.options)
          const result = await handler(this.req, this.res)
          assert.deepEqual(this.res.setHeader.args, [["Allow", "GET, POST"]])
        })

        it("sets the status code to 405", async function() {
          this.req.method = "PUT"
          const handler = expressLyriql(this.types, this.queries, this.options)
          const result = await handler(this.req, this.res)
          assert.equal(this.res.statusCode, 405)
        })

        it("sends an error", async function() {
          this.req.method = "PUT"
          const handler = expressLyriql(this.types, this.queries, this.options)
          const result = await handler(this.req, this.res)
          assert.deepEqual(this.res.send.args, [[{ error: "LyriQL middleware only supports GET and POST requests" }]])
        })
      })

      context("when the UI is enabled", function() {
        context("when the path is /ui", function() {
          it("sends an error", async function() {
            this.req.path = "/ui"
            const handler = expressLyriql(this.types, this.queries, this.options)
            const result = await handler(this.req, this.res)
            assert.ok(/class="lyriql-ui"/.test(this.res.send.args[0][0]))
          })
        })
      })

      context("when there is a server error", function() {
        it("sets the status code to 405", async function() {
          this.req.body = "{ wrong }"
          const handler = expressLyriql(this.types, this.queries, this.options)
          const result = await handler(this.req, this.res)
          assert.equal(this.res.statusCode, 500)
        })

        it("sends an error", async function() {
          this.req.body = "{ wrong }"
          const handler = expressLyriql(this.types, this.queries, this.options)
          const result = await handler(this.req, this.res)
          assert.ok(this.res.send.args[0][0].hasOwnProperty("error"))
        })
      })

    })

  })

})
