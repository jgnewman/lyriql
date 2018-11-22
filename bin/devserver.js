const express = require('express')
const bodyParser = require('body-parser')
const { expressLyriql, expect, demand } = require('../src/index')

const spec = {

  Root: {
    viewer: {
      type: demand('Person'),
      params: { token: demand(String) },
      resolve: async ({ params }, context) => {
        return {
          id: '1',
          name: 'John',
          friendIDs: ['2', '3'],
          stats: { hair: 'brown', eyes: 'blue' }
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
    stats: {
      type: demand('Stats'),
      resolve: async ({ data }) => data.stats
    },
    friends: {
      type: demand([ demand('Person') ]),
      resolve: async ({ data }) => {
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
  },

  Stats: {
    hair: {
      type: demand(String),
      resolve: async ({ data }) => data.hair
    },
    eyes: {
      type: demand(String),
      resolve: async ({ data }) => data.eyes
    },
  }
}

const app = express()

app.use(bodyParser.text())

app.use('/lyriql', expressLyriql(spec, { ui: true }))

app.get('/', (req, res) => {
  res.send(`
    <!doctype html>
    <html>
      <head></head>
      <body>
        <h1>LyriQL Dev Server!</h1>
      </body>
    </html>
  `)
})

console.log('Dev server listening on port 4000')
app.listen(4000)
