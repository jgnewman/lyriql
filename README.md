![LyriQL](https://raw.githubusercontent.com/jgnewman/lyriql/master/lyriql-logo.png) **BETA**

LyriQL (pronounced "lyrical") is an alternative to GraphQL designed to make nested data processing easier and more intuitive.

In terms of usage it is very similar to GraphQL but it also contains a few key differences. This readme assumes you have never used GraphQL before and does not make comparisons between LyriQL and GraphQL.

## How it works

### Queries

With LyriQL, requests made from the front-end describe the shape of the data you want to return from the server, no convoluted API endpoints required!

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
const userFragment = `{
  name
  email
}`;

`
{
  user(id: 123) ${userFragment}
  user(id: 456) ${userFragment}
}
`
```

Doing this will cause the server to return an array containing both users. Speaking of arrays, you'll notice that we don't need any kind of `[ square bracket ]` syntax to specify arrays. The server is smart enough to figure it out. For example, let's say you wanted to get a list of friends along with your basic user data.

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

You'll need to make sure there is a single route on the server allocated to LyriQL queries. By convention, we normally use `//your-url.com/lyriql`.

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

const response = await fetch('/lyriql', {
  method: 'POST',
  body: query
})

await response.json() // { data: { ... } }
```

On the server side, import LyriQL and funnel post requests on this route to it:

```javascript
import { handleQuery } from 'lyriql'

YOUR_ROUTER.on('POST', '/lyriql', async (req, res) => {

  const query = req.body  // <- Grab the query text coming in from the front-end
  const spec = spec       // <- We'll talk about what spec is in a second

  const data = await handleQuery(query, spec, req)
  res.send(data)

})
```

Or, if you're using the **Express middleware**, there's less to think about:

```javascript
import express from 'express'
import bodyParser from 'body-parser' // <- Because, you know, express
import { expressLyriql } from 'lyriql'

const app = express()
app.use(bodyParser.text())

app.use('/lyriql', expressLyriql(spec))
```

LyriQL will process the request, run it through your spec (which we'll discuss momentarily), and hand you back a Promise that resolves with the requested data. When everything goes well, the result has a `data` property (for example, `{ data: <RESPONSE_DATA> }`). If something goes wrong, it will instead have an `error` property (for example, `{ error: <ERROR_TEXT> }`).

### Processing queries

Of course, LyriQL isn't magic. In order for your queries to work, you have to define what the front-end is allowed to ask for. This is done via a `spec` object.

A **spec** object defines the allowed structure for your queries, enforces data types, and contains functions that actually fetch and process the requested data.

Your spec object must include a `Root` property at the top level that serves an an entry point. Here's an example spec:

```javascript
import { expect, demand } from 'lyriql'
import db from 'whatever-database-tool-you-use'

const spec = {

  Root: {
    user: {
      type: expect('Person'),
      params: { id: demand(Number) },
      resolve: async ({ params }) => db.getUserById(params.id)
    }
  },

  Person: {
    id: {
      type: demand(Number),
      resolve: ({ data }) => data.id
    },

    name: {
      type: demand(String),
      resolve: ({ data }) => data.name
    },

    email: {
      type: demand(String),
      resolve: ({ data }) => data.email
    },

    friends: {
      type: demand([ demand('Person') ]),
      resolve: async ({ data }) => {
        const friends = []
        await Promise.all(data.friendIDs.map(async (friendID) => {
          const friend = await db.getUserById(friendID)
          friends.push(friend)
        }))
        return friends
      }
    }
  }

}
```

We could use the following query with this spec:

```javascript
`
{
  user(id: 123) {
    name
    email
    friends {
      name
      email
    }
  }
}
`
```

The query is looking for a `user` so LyriQL will try to find a `user` description in the `Root` of your spec, since that's the entry point. If it doesn't find one, it'll send you back a useful error.

Upon finding the user description, LyriQL starts checking types. The query contains an `id` param so the spec will need to describe what type of data that param is allowed to take. In this example, we've said that we `demand` a `Number` for the `id` param. This way, if any other kind of data gets sent in for this parameter, we'll get another useful error.

> Note: rather than using `demand`, we could have used `expect`. The only difference between the two is that `expect` doesn't throw an error on a `null` result. So if there's a chance your data might not exist, make sure to use `expect` and return `null`.

We've specified in the `user` description that the data returned from the call should take the form of a `Person`. Because `'Person'` is a custom string and not a native type constructor, LyriQL will take the data returned by the call and make sure it matches another object in the spec called `Person`. However, before it does, it will use the `resolve` function to actually fetch the user data. Notice that this function is called with an object containing the params that were sent in the query.

When the `resolve` function spits out a user object, LyriQL will automatically take that object and pass it as the `data` argument to every function in the `Person` spec that corresponds to a field we requested in the query to determine how to populate that field in the end result.

Notice that each of these fields makes use of a type checker to ensure that they always return the correct type of data. In particular, the `friends` field will only be happy if it returns an array of `Person` objects.

When the `friends` resolver runs, it will fetch a list of user objects from the database and return the raw list. Because the `friends` type checker demands a list of `Person`s, each object in the list will be recursively passed through the `Person` spec in order to properly resolve their respective fields. The recursion doesn't go on forever because our query doesn't request every friend's friends' friends, etc – just one users list of friends.

## Digging deeper

### Testing your spec

If you are using the Express middleware, you have the option of enabling a graphical interface that will allow you to interact with your spec. You can turn it on like so:

```javascript
app.use('/lyriql', expressLyriql(spec, { ui: true }))
```

Now if you visit `your-url.com/lyriql/ui`, you'll be given a simple, clean interface where you can type a query on the left, hit the "run" button, and see your result on the right.

![LyriQL UI](https://raw.githubusercontent.com/jgnewman/lyriql/master/lyriql-ui.png)

### Modifying data

So far we've only talked about querying, so it may not be immediately obvious how you would handle sending new updates to the server. Fortunately, there's nothing crazy here. Here's an example that updates user data:

```javascript
// Query text
`
{
  updateUser(id: 123, changes: { "name": "Sam", "email": "sam@example.com" })
}
`

// Spec
{
  Root: {
    updateUser: {

      type: demand(String),

      params: {
        id: demand(Number),
        changes: demand(Object)
      },

      resolve: async ({ params }) => {
        await db.updateUserById(params.id, params.changes)
        return 'Success!'
      }

    }
  }
}
```

In this case, we haven't changed anything at all about our querying technique. The only new piece we've added is the ability to pass an object in with our query text.

Note that your object needs to be written in properly formatted JSON.

One other thing to note is that `expect` and `demand` treat `Array` differently from `Object`. If you expect an object, don't give it an array, and _vice versa_.

### Authentication

At this point you should be pretty comfortable with passing parameters to LyriQL, so the idea of authenticating a user should be pretty straightforward. Where it might start to get tricky is when you need to hold on to context as data gets passed through resolvers. Fortunately, LyriQL has your back.

Here's an example of an authentication workflow that should get you everything you need:

#### Step 1: Authenticate

```javascript
// Query text
`
{
  authenticate(email: "foo@example.com", password: "Password1")
}
`

// Spec Field
authenticate: {

  type: expect(String),

  params: {
    email: demand(String),
    password: demand(String),
  },

  resolve: async ({ params }) => {
    const user = await db.getUser(params.email, params.password)
    return user ? getTokenForUser(user) : null
  }

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

// Spec
{
  Root: {
    authenticate: <Authenticate Spec Here>,

    teamData: {
      type: expect('Team')
      params: {
        token: demand(String)
      },
      resolve: async ({ params }, context) => {
        const user = await getUserFromToken(params.token)
        const team = await getTeamByUserId(user.id)
        context.viewer = user
        return team
      }
    }
  },

  Team: {

    members: {
      type: demand([ demand('Person') ]),
      resolve: async ({ data }) => {
        const members = await getTeamMembers(data.memberIDs)
        return members
      }
    }

    billingData: {
      type: expect('BillingData'),
      resolve: async ({ data }, { viewer }) => {
        if (!viewer.isAdmin) {
          return null
        } else {
          return data.billingData
        }
      }
    }

  },

  Person: <Person Spec Here>,
  BillingData: <BillingData Spec Here>
}
```

The key here comes in recognizing that each resolver function actually takes 2 arguments. The first is an object that contains any params and data, as you've already seen. The second is an object that contains any context data you want that stays localized to the request as a whole.

In the `teamData` function, we add the authenticated user's record to the context and called it `viewer`. Then, in the `billingData` function, we were able to access the `viewer` context and return null if the viewer is not an admin.
