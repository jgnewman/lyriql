const express = require('express')
const bodyParser = require('body-parser')
const { expressLyriql } = require('../src/index')

const types = {
  Person: {
    id: {type: "String", resolve: async ({ data }) => data.id},
    name: {type: "String", resolve: async ({ data }) => data.name},
    isAdmin: {type: "Boolean", resolve: async ({ data }) => data.isAdmin},
    friends: {type: ["Person!"], resolve: async ({ data }) => data.friends},
    adminId: {type: "String", resolve: async ({ data }) => data.adminId},
  }
}

const queries = {
  fauxCall: {
    type: "Object!", // Since this is not a custom type, it won't be run through a resolver. It just returns raw.
    resolve: async () => {
      return {
        thing1: "x",
        thing2: "x",
      }
    },
  },

  viewer: {
    type: "Person!",
    resolve: async ({ args, context }) => {
      return {
        id: "123",
        name: "Sam Jones",
        friends: [
          {id: "1", name: "one", isAdmin: false},
          {id: "2", name: "two", isAdmin: true, adminId: "three"},
        ],
      }
    }
  }
}

const app = express()

app.use(bodyParser.text())

app.use('/lyriql', expressLyriql(types, queries, { ui: true }))

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
