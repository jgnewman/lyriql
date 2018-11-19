const assert = require('assert')
const Chromatica = require('chromatica')
const express = require('express')
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
      this.expressServer = this.expressApp.listen(3001)
    })

    afterEach(function () {
      this.expressServer.close()
    })

    it('loads a page', async function () {
      const result = await this.page.evaluate(() => 'hello')
      assert.equal(result, 'hello')
    })
  })
})
