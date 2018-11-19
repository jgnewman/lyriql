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
    throw new Error('HarkerQL requires query text, a schema, and a resolver')
  }

  const handler = new RequestHandler(query, schema, resolver)
  return handler.resolveRequest()
}

// is req.body formatted correctly?
// can we send an object without JSONifying first?
const harkerExpress = ({ schema, resolver }) => {

  if (!schema || !resolver) {
    throw new Error('HarkerQL middleware requires a schema and a resolver')
  }

  return async (req, res, next) => {

    if (req.method !== 'GET' && req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      res.statusCode = 405
      res.send({ error: 'HarkerQL middleware only supports GET and POST requests' })
    }

    try {
      const result = await handleQuery({
        query: req.body,
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
  harkerExpress,
  demand,
  expect,
}

// const handler = new RequestHandler(
//   `{
//     viewer(token: "asdfasdfasdf", json: [{"foo": "bar"}]) {
//       id
//       name
//       friends {
//         id
//         name
//       }
//     }
//   }`,
//   { // schema
//     Root: {
//       viewer: {
//         params: {
//           token: demand(String), // vs expect
//           json: demand(Array)
//         },
//         data: demand('Person')
//       },
//     },
//     Person: {
//       id: demand(String),
//       name: demand(String),
//       friends: demand([ demand('Person') ])
//     }
//   },
//   { // resolver
//     Root: {
//       viewer: async ({ params }, context) => {
//         return { id: '1', name: 'John' }
//       }
//     },
//     Person: {
//       id: async ({ data }) => {
//         return data.id
//       },
//       name: async ({ data }) => {
//         return data.name
//       },
//       friends: async ({ data }) => {
//         return [{id: '2', name: 'Patrick'}, {id: '3', name: 'Mary'}]
//       }
//     }
//   }
// )
//
// const go = async () => {
//   const begin = +new Date
//   const resolved = await handler.resolveRequest()
//   const end = +new Date
//   console.log(end - begin, JSON.stringify(resolved))
// }
// go()
