# HarkerQL

HarkerQL is an alternative to GraphQL designed to make nested data processing easier and more intuitive.

In terms of usage it is very similar to GraphQL but it also contains a few key differences. This readme assumes you have never used GraphQL before and does not make comparisons between HarkerQL and GraphQL.

## How it works

### Queries

With HarkerQL, requests made from the front-end describe the shape of the data you want to return from the server, no convoluted API endpoints required!

For example, let's say you want to grab data for a particular user. In a simple case, you might write your query like this:

```javascript
`
{
  user(id: 123)
}
`
```

Doing it this way will return the full data object for a user with the ID of `123`. However, you may not want the full object. Maybe all you want is the user's name and email. In that case, you could do this instead:

```javascript
`
{
  user(id: 123) {
    name
    email
  }
}
`
```

In this case, the data returned will contain _only_ the name and email fields, regardless whether there is more user data available.

Now let's say you want 2 users. No problem! Just spell it out:

```javascript
const userFragment = `
  {
    name
    email
  }
`;


`
{
  user(id: 123) ${userFragment}
  user(id: 456) ${userFragment}
}
`
```

Doing this will cause the server to return an array containing both users. Speaking of arrays, you'll notice that we don't need any kind of `[ square bracket ]` syntax to specify arrays. The server is smart enough to figure it out. For example, let's say you wanted to get a list of friends along with your basic user data. There could be many!

```javascript
`
{
  user(id: 123) {
    name
    email
    friends {
      id
      name
      email
    }
  }
}
`
```

In this case, the resulting data will look something like this:

```javascript
{
  data: {
    name: 'Billy',
    email: 'billy@example.com',
    friends: [
      {
        id: 234,
        name: 'Sally',
        email: 'sally@example.com'
      },
      {
        id: 345,
        name: 'Jack',
        email: 'jack@example.com'
      }
    ]
  }
}
```

And just like that, it becomes easier than ever to query data!

### Getting queries to the server

You'll need to make sure there is a single route on the server allocated to HarkerQL queries. By convention, we normally use `//your-url.com/harkerql`.

You _don't_ need special handlers for all the possible REST request types since everything you want to happen is specified in your query text. Instead, we normally just default to intercepting the GET or POST method. In fact, if you use the Express middleware, it only allows GET and POST.

So go ahead and fire off your query to the server using whatever tool you want:

```javascript
const query = `
{
  user(id: 123) {
    name
    email
  }
}
`

const response = await fetch('/harkerql', {
  method: 'POST',
  body: query
})

await response.json() // { data: { ... } }
```

On the server side, import HarkerQL and funnel post requests on this route to it:

```javascript
import { handleQuery } from 'harkerql'

YOUR_ROUTER.post('/harkerql', async (req, res) => {
  const data = await handleQuery({
    query: req.body,    // <- This is the query text from the front-end
    schema: schema,     // <- We'll talk about this in a second
    resolver: resolverv // <- This too
  })
  res.send(data)
})
```

...or, if you're using the **Express middleware**...

```javascript
import express from 'express'
import bodyParser from 'body-parser' // <- Because, you know, express
import { harkerExpress } from 'harkerql'

const app = express()
app.use(bodyParser.text())

app.use('/harkerql', harkerExpress({
  schema: schema,
  resolver, resolver
}))
```

HarkerQL will process the request, run it through your schema and resolver (which we'll discuss momentarily), and hand you back a Promise that resolves with the requested data. When everything goes well, the result has a `data` property (for example, `{ data: <RESPONSE_DATA> }`). If something goes wrong, it will instead have an `error` property (for example, `{ error: <ERROR_TEXT> }`).

### Processing queries

Of course, HarkerQL isn't magic. In order for your queries to work, you have to define what the front-end is allowed to ask for. This is done via 2 objects, namely a **schema** and a **resolver**.

A **schema** object defines the allowed structure for your queries and enforces data types.

A **resolver** contains functions corresponding to the schema that serve to actually fetch and process the requested data.

Both your schema and resolver objects must include a `Root` property at the top level that serves an an entry point. Here's an example schema:

```javascript
import harker from 'harkerql'
const { expect, demand } = harker

const schema = {

  Root: {
    user: {
      params: { id: demand(Number) },
      data: expect('Person'),
    }
  },

  Person: {
    id: demand(Number),
    name: demand(String),
    email: demand(String),
    friends: demand([ demand('Person') ]),
  }

}
```

In the schema, the fields in the `Root` object define the top level queries the front-end can make. In this case, we've only allowed the front-end to query for a user. Any field that requires parameters is written as an object with a `params` key and a `data` key. We then use the `demand` and `expect` functions to lock down what type of data can be sent through as a parameter and what type of data we expect to be returned. The difference between these two functions is that `expect` will allow the value `null`, but `demand` will not.

In any case where we pass a custom type name (such as "Person") to `expect/demand`, we need to make sure our schema defines what this custom type looks like. Since none of the fields on a Person need to take parameters of their own, we can write each one as an instance of `expect/demand`, denoting what type of data must be returned for that field. Notice that `friends` demands an array of Person objects.

#### Now it's time to actually fetch the data!

Here is an example of a corresponding resolver:

```javascript
import db from 'whatever-database-tool-you-use'

const resolver = {

  Root: {
    user: async ({ params }) => db.getUserById(params.id)
  },

  Person: {

    id: ({ data }) => data.id,

    name: ({ data }) => data.name,

    email: ({ data }) => data.email,

    friends: async ({ data }) => {
      const friends = []
      await Promise.all(data.friendIDs.map(async (friendID) => {
        const friend = await db.getUserById(friendID)
        friends.push(friend)
      }))
      return friends
    }
  }

}
```

Our resolver will need to have keys corresponding to each key in our schema. Each one is a function that explains how to resolve that particular piece of data. The `user` function, for example, is handed an object with the given parameters and fetches user data from the database.

Because our schema has demanded that the result of calling `user` should match the Person spec, that raw user object will then be processed by the Person resolver automatically. Every field the front-end requested will be generated by calling the corresponding function in the Person resolver, and passing the raw user object in as the `data` argument you can see in the example.

Notice that you can make any of these functions asynchronous using Promises. Also, because the schema demands that `friends` should be an array of `Person` objects, each raw user object in the array returned by the `friends` function will also be processed by the Person resolver automatically.

## Digging deeper

### Modifying data

So far we've only talked about querying, so it may not be immediately obvious how you would handle sending new updates to the server. Fortunately, there's nothing crazy here. Here's an example that updates user data:

```javascript
// Query text
`
{
  updateUser(id: 123, changes: { "name": "Sam", "email": "sam@example.com" })
}
`

// Schema
{
  Root: {
    updateUser: {
      params: {
        id: demand(Number),
        changes: demand(Object)
      }
      data: demand(String)
    }
  }
}

// Resolver
{
  Root: {
    async updateUser({ params }) {
      await db.updateUserById(params.id, params.changes)
      return 'Success!'
    }
  }
}
```

In this case, we haven't changed anything at all about our querying technique. The only new piece we've added is the ability to pass an object in with our query text.

Note that your object needs to be written in properly formatted JSON.

One other thing to note is that `expect` and `demand` treat `Array` differently from `Object`. If you expect an object, don't give it an array, and _vice versa_.

### Authentication

At this point you should be pretty comfortable with passing parameters to HarkerQL, so the idea of authenticating a user should be pretty straightforward. Where it might start to get tricky is when you need to hold on to context as data gets passed through resolvers. Fortunately, HarkerQL has your back.

Here's an example of an authentication workflow that should get you everything you need:

#### Step 1: Authenticate

```javascript
// Query text
`
{
  authenticate(email: "foo@example.com", password: "Password1")
}
`

// Schema Field
authenticate: {
  params: {
    email: demand(String),
    password: demand(String),
  },
  data: expect(String)
}

// Resolver Field
authenticate: async ({ params }) => {
  const user = await db.getUser(params.email, params.password)
  return user ? getTokenForUser(user) : null
}
```

This example gets us a token. Great. But now we want to use that token to fetch some data that only admin users get to access. Here's how we do it:

#### Step 2: Retain Context

```javascript
// Query text
`
{
  teamData(token: ${token}) {
    members
    billingData
  }
}
`

// Schema
{
  Root: {
    authenticate: <Authenticate Schema Here>,
    teamData: {
      params: {
        token: demand(String)
      },
      data: expect('Team')
    }
  },
  Team: {
    members: demand([ demand('Person') ]),
    billingData: expect('BillingData')
  },
  Person: <Person Schema Here>,
  BillingData: <BillingData Schema Here>
}

// Resolver
{
  Root: {
    authenticate: <Authenticate Resolver Here>,

    teamData: async ({ params }, context) => {
      const user = await getUserFromToken(params.token)
      const team = await getTeamByUserId(user.id)

      context.viewer = user

      return team
    }
  },

  Team: {
    members: async ({ data }) => {
      const members = await getTeamMembers(data.memberIDs)
      return members
    },

    billingData: async ({ data }, { viewer }) => {
      if (!viewer.isAdmin) {
        return null
      } else {
        return data.billingData
      }
    }
  },

  Person: <Person Resolver Here>,
  BillingData: <BillingData Resolver Here>,
}
```

The key here comes in recognizing that each resolver function actually takes 2 arguments. The first is an object that contains any params and data, as you've already seen. The second is an object that contains any context data you want that stays localized to the request as a whole.

In the `teamData` function, we add the authenticated user's record to the context and called it `viewer`. Then, in the `billingData` function, we were able to access the `viewer` context and return null if the viewer is not an admin.
