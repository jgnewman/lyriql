// HarkerQL

// frontend
`{
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
const { expect, demand } = hql
const schema = {
  Root: {
    viewer: {
      params: {
        token: demand(String) // vs expect
      },
      data: demand('Person')
    },
  },
  Person: {
    id: demand(String),
    name: demand(String),
    friends: demand([ demand('Person') ])
  }
}
const resolver = {
  Root: {
    // The first object passed to any function is
    // a local context object containing any params for this
    // particular data fetch, as well as any implicit data
    // that should be available.
    //
    // The context object holds the http request and you can
    // add more values to it as you go if you want
    viewer: async ({ params }, context) => {
      const personRef = _verifyToken(params.token)
      const person = _db.get(personRef.id)
      return person
      // Because viewer data demands a Person type,
      // the raw person record will automatically be
      // run through resolver.Person and will be
      // assigned as `data` in each call
    }
  },
  Person: {
    id({ data }) {
      return data.id
    },
    name({ data }) {
      return data.name
    },
    friends: async ({ data }) => {
      const friends = _db.getAll(data.friendIds)
      return friends
      // Because friends demands an array of Person types,
      // each item we return here will automatically be run
      // through the person resolver again and each item will
      // be assigned to `data` for the resolver functions
    }
  }
}
app.use(hql({ schema, resolver }))
