const fs = require('fs')
const path = require('path')
const { Expecter, Demander, OK } = require('./validators')
const RequestHandler = require('./request-handler')

function demand(type) {
  return new Demander(type)
}

function expect(type) {
  return new Expecter(type)
}

// Raw query handler
async function handleQuery (query, spec, req) {
  if (!query || !spec) {
    throw new Error('LyriQL requires query text and a spec object')
  }

  const handler = new RequestHandler(query, spec, req)
  return handler.resolveRequest()
}

function expressLyriql(spec, options={}) {
  if (!spec) {
    throw new Error('LyriQL middleware requires a spec object')
  }

  return async (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      res.statusCode = 405
      return res.send({ error: 'LyriQL middleware only supports GET and POST requests' })
    }

    if (options.ui && req.path === '/ui') {
      const html = fs.readFileSync(path.resolve(__dirname, './ui-template.html')).toString()
      return res.send(html)
    }

    let query = null

    if (req.method === 'GET') {
      query = req.query.query
      if (query[0] === '%') {
        query = decodeURIComponent(query)
      }
    }

    else if (req.method === 'POST') {
      query = req.body
    }

    try {
      const result = await handleQuery(query, spec, req)

      if (result.data) {
        res.statusCode = 200
      }

      if (result.error) {
        res.statusCode = 400
      }

      res.send(result)

    } catch (err) {
      res.statusCode = 500
      res.send({ error: err.message ? err.message : err.toString() })
    }
  }
}

module.exports = {
  handleQuery,
  expressLyriql,
  demand,
  expect,
}
