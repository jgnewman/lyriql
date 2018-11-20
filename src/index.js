const { Expecter, Demander, OK } = require('./validators')
const RequestHandler = require('./request-handler')

function demand(type) {
  return new Demander(type)
}

function expect(type) {
  return new Expecter(type)
}

// Raw query handler
const handleQuery = async ({ query, schema, resolver }) => {

  if (!query || !schema || !resolver) {
    throw new Error('LyriQL requires query text, a schema, and a resolver')
  }

  const handler = new RequestHandler(query, schema, resolver)
  return handler.resolveRequest()
}

// is req.body formatted correctly?
// can we send an object without JSONifying first?
const expressLyriql = ({ schema, resolver }) => {

  if (!schema || !resolver) {
    throw new Error('LyriQL middleware requires a schema and a resolver')
  }

  return async (req, res, next) => {

    if (req.method !== 'GET' && req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      res.statusCode = 405
      return res.send({ error: 'LyriQL middleware only supports GET and POST requests' })
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
      const result = await handleQuery({
        query: query,
        schema: schema,
        resolver: resolver,
      })

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
