// LyriQL v2
const { handleGraph } = require('../src/index')

// frontend
const graph = ["::compose",
  ["fauxCall", {token: "foo"}],

  ["viewer", {token: "asdfasdfasdf"},
    "id",
    "name",

    ["friends", {start: 0, end: 10},
      "id",
      "name",
      "isAdmin",

      ["::when", {eql: ["isAdmin", true]},
        "adminId",
      ],
    ],
  ],
]

// expected outcome
/*
{
  errors: null,
  data: {
    fauxCall: {
      thing1: "x",
      thing2: "x",
    },
    viewer: {
      id: "x",
      name: "x",
      friends: [
        {
          id: "x",
          name: "x",
          isAdmin: false,
        },
        {
          id: "x",
          name: "x",
          isAdmin: true,
          adminId: "x"
        }
      ]
    }.
  },
}
*/

// types
const types = {
  Person: {
    id: {type: "String", resolve: async ({ data }) => data.id},
    name: {type: "String", resolve: async ({ data }) => data.name},
    isAdmin: {type: "Boolean", resolve: async ({ data }) => data.isAdmin},
    friends: {type: ["Person!"], expect: {start: "Number", end: "Number"}, resolve: async ({ data }) => data.friends},
    adminId: {type: "String", resolve: async ({ data }) => data.adminId},
  }
}

// calls
const queries = {
  fauxCall: {
    type: "Object!", // Since this is not a custom type, it won't be run through a resolver. It just returns raw.
    expect: { token: "String!" },
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
        id: "x",
        name: "x",
        friends: [
          {id: "1", name: "one", isAdmin: false},
          {id: "2", name: "two", isAdmin: true, adminId: "three"},
        ],
      }
    }
  }
}

const go = async () => {
  const begin = +new Date
  const result = await handleGraph(graph, types, queries)
  const end = +new Date
  console.log('\nCompleted in', (end - begin) + 'ms\n')
  console.log(JSON.stringify(result, null, 2))
}
go()
