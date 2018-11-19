const { Expecter, Demander, OK } = require('./validators')
const RequestHandler = require('./request-handler')

function demand(type) {
  return new Demander(type)
}

function expect(type) {
  return new Expecter(type)
}

const handler = new RequestHandler(
  `{
    viewer(token: "asdfasdfasdf", json: [{"foo": "bar"}]) {
      id
      name
      friends {
        id
        name
      }
    }
  }`,
  { // schema
    Root: {
      viewer: {
        params: {
          token: demand(String), // vs expect
          json: demand(Array)
        },
        data: demand('Person')
      },
    },
    Person: {
      id: demand(String),
      name: demand(String),
      friends: demand([ demand('Person') ])
    }
  },
  { // resolver
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
      },
      friends: async ({ data }) => {
        return [{id: '2', name: 'Patrick'}, {id: '3', name: 'Mary'}]
      }
    }
  }
)

const go = async () => {
  const begin = +new Date
  const resolved = await handler.resolveRequest()
  const end = +new Date
  console.log(end - begin, JSON.stringify(resolved))
}
go()

const harker = async ({ query, schema, resolver }) => {
  const handler = new RequestHandler(query, schema, resolver)
  return handler.resolveRequest()
}

harker.expect = expect
harker.demand = demand

module.exports = harker
