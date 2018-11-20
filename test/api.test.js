const assert = require('assert')
const Chromatica = require('chromatica')
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')

const { handleQuery, harkerExpress, demand, expect } = require('../src/index')
const { Expecter, Demander } = require('../src/validators')


describe('api', function () {
  describe('demand', function () {
    it('creates a demander instance', function () {
      const demander = demand(String)
      assert.ok(demander instanceof Demander)
    })
  })

  describe('expect', function () {
    it('creates an expecter instance', function () {
      const expecter = expect(String)
      assert.ok(expecter instanceof Expecter)
    })
  })

  describe('handleQuery', function () {
    beforeEach(function () {
      this.query = `{
        viewer(token: "asdfasdfasdf") {
          id
          name
        }
      }`
      this.schema = {
        Root: {
          viewer: {
            params: {
              token: demand(String)
            },
            data: demand('Person')
          },
        },
        Person: {
          id: demand(String),
          name: demand(String),
        }
      }
      this.resolver = {
        Root: {
          viewer: async ({ params }, context) => {
            return { id: '1', name: 'John' }
          }
        },
        Person: {
          id: async ({ data }) => {
            return data.id
          },
          name: async ({ data }) => {
            return data.name
          }
        }
      }
    })

    context('when no query text is provided', function () {
      it('throws an error', async function () {
        await assert.rejects(async () => {
          this.query = undefined
          await handleQuery({
            query: this.query,
            schema: this.schema,
            resolver: this.resolver,
          })
        })
      })
    })

    context('when no schema is provided', function () {
      it('throws an error', async function () {
        await assert.rejects(async () => {
          this.schema = undefined
          await handleQuery({
            query: this.query,
            schema: this.schema,
            resolver: this.resolver,
          })
        })
      })
    })

    context('when no resolver is provided', function () {
      it('throws an error', async function () {
        await assert.rejects(async () => {
          this.resolver = undefined
          await handleQuery({
            query: this.query,
            schema: this.schema,
            resolver: this.resolver,
          })
        })
      })
    })

    context('when arguments are provided properly', function () {
      it('resolves a request', async function () {
        const result = await handleQuery({
          query: this.query,
          schema: this.schema,
          resolver: this.resolver,
        })
        assert.deepEqual(result, { data: { id: '1', name: 'John' } })
      })
    })
  })

  describe('harkerExpress', function () {
    before(async function () {
      const port = 3000
      const routes = [{
        test: null,
        file: `
          <!doctype html>
          <html>
            <head></head>
            <body></body>
          </html>
        `
      }]
      this.chromatica = new Chromatica({ port, routes })
      this.page = await this.chromatica.getPage()
    })

    after(async function () {
      await this.page.close()
      await this.chromatica.closeBrowser()
    })

    beforeEach(function () {
      this.expressApp = express()
      this.expressApp.use(cors())
      this.expressApp.use(bodyParser.text())
      this.expressServer = this.expressApp.listen(3001)
      this.schema = {
        Root: {
          viewer: {
            params: {
              token: demand(String)
            },
            data: demand('Person')
          },
        },
        Person: {
          id: demand(String),
          name: demand(String),
        }
      }
      this.resolver = {
        Root: {
          viewer: async ({ params }, context) => {
            return { id: '1', name: 'John' }
          }
        },
        Person: {
          id: async ({ data }) => {
            return data.id
          },
          name: async ({ data }) => {
            return data.name
          }
        }
      }
    })

    afterEach(function () {
      this.expressServer.close()
    })

    context('when no schema is provided', function () {
      it('throws an error', function () {
        assert.throws(function () {
          harkerExpress({ resolver: this.resolver })
        })
      })
    })

    context('when no resolver is provided', function () {
      it('throws an error', function () {
        assert.throws(function () {
          harkerExpress({ schema: this.resolver })
        })
      })
    })

    context('when the request method is not GET or POST', function () {
      it('returns a 405 with error json', async function () {

        this.expressApp.use('/harkerql', harkerExpress({
          schema: this.schema,
          resolver: this.resolver
        }))

        const result = await this.page.evaluate(async () => {
          try {
            const response = await fetch('http://localhost:3001/harkerql', {
              method: 'PUT',
              body: `{
                viewer(token: "asdfasdfasdf") {
                  id
                  name
                }
              }`
            })
            const text = await response.json()
            return JSON.stringify([text, response.status])
          } catch (err) {
            return `{ "error": "${err.toString()}" }`
          }
        })

        const parsedResult = JSON.parse(result)

        assert.equal(parsedResult[1], 405)
        assert.ok(parsedResult[0].hasOwnProperty('error'))
      })
    })

    context('when an invalid query is made', function () {
      it('returns a 400 with error json', async function () {

        this.expressApp.use('/harkerql', harkerExpress({
          schema: this.schema,
          resolver: this.resolver
        }))

        const result = await this.page.evaluate(async () => {
          try {
            const response = await fetch('http://localhost:3001/harkerql', {
              method: 'POST',
              body: `bad query`
            })
            const text = await response.json()
            return JSON.stringify([text, response.status])
          } catch (err) {
            return `{ "error": "${err.toString()}" }`
          }
        })

        const parsedResult = JSON.parse(result)

        assert.equal(parsedResult[1], 400)
        assert.ok(parsedResult[0].hasOwnProperty('error'))
      })
    })

    context('when a valid POST query is made', function () {
      it('returns the expected result', async function () {

        this.expressApp.use('/harkerql', harkerExpress({
          schema: this.schema,
          resolver: this.resolver
        }))

        const result = await this.page.evaluate(async () => {
          try {
            const response = await fetch('http://localhost:3001/harkerql', {
              method: 'POST',
              body: `{
                viewer(token: "asdfasdfasdf") {
                  id
                  name
                }
              }`
            })
            const text = await response.text()
            return text
          } catch (err) {
            return `{ "error": "${err.toString()}" }`
          }
        })

        assert.deepEqual(JSON.parse(result), { data: { id: '1', name: 'John' } })
      })
    })

    context('when a valid, nonencoded GET query is made', function () {
      it('returns the expected result', async function () {

        this.expressApp.use('/harkerql', harkerExpress({
          schema: this.schema,
          resolver: this.resolver
        }))

        const result = await this.page.evaluate(async () => {
          try {

            const url = new URL('http://localhost:3001/harkerql')
            url.search = new URLSearchParams({
              query: `{
                viewer(token: "asdfasdfasdf") {
                  id
                  name
                }
              }`
            })

            const response = await fetch(url)
            const text = await response.text()
            return text

          } catch (err) {
            return `{ "error": "${err.toString()}" }`
          }
        })
        console.log(result)
        assert.deepEqual(JSON.parse(result), { data: { id: '1', name: 'John' } })
      })
    })

    context('when a valid, encoded GET query is made', function () {
      it('returns the expected result', async function () {

        this.expressApp.use('/harkerql', harkerExpress({
          schema: this.schema,
          resolver: this.resolver
        }))

        const result = await this.page.evaluate(async () => {
          try {

            const url = new URL('http://localhost:3001/harkerql')
            url.search = new URLSearchParams({
              query: encodeURIComponent(`{
                viewer(token: "asdfasdfasdf") {
                  id
                  name
                }
              }`)
            })

            const response = await fetch(url)
            const text = await response.text()
            return text

          } catch (err) {
            return `{ "error": "${err.toString()}" }`
          }
        })
        console.log(result)
        assert.deepEqual(JSON.parse(result), { data: { id: '1', name: 'John' } })
      })
    })

  })
})
