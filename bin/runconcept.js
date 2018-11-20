// LyriQL v2
const { handleQuery, expect, demand } = require('../src/index')

// frontend
const query = `{
  viewer(token: "asdfasdfasdfadsf") {
    id
    name
    friends {
      id
      name
    }
  }
}`

// backend
const spec = {

  Root: {
    viewer: {
      type: demand('Person'),
      params: { token: demand(String) },
      resolve: async ({ params }, context) => {
        return {
          id: '1',
          name: 'John',
          friendIDs: ['2', '3']
        }
      }
    }
  },

  Person: {
    id: {
      type: demand(String),
      resolve: async ({ data }) => data.id
    },
    name: {
      type: demand(String),
      resolve: async ({ data }) => data.name
    },
    friends: {
      type: demand([ demand('Person') ]),
      resolve: async ({ data }) => {
        // Theoretically map data.friendIDs and pull person objects
        return [
          {
            id: '2',
            name: 'Bob'
          },
          {
            id: '3',
            name: 'Bill'
          }
        ]
      }
    }
  }
}

const go = async () => {
  const begin = +new Date
  const result = await handleQuery(query, spec)
  const end = +new Date
  console.log('\nCompleted in', (end - begin) + 'ms\n')
  console.log(JSON.stringify(result, null, 2))
}
go()
