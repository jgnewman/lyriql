const ensure = require("./ensure")
const {
  isPlainObject,
  isAllowedNativeType,
  objectLoop,
  buildTypeObject,
} = require("./helpers")

const comparisons = {
  eql: (value, expected) => value === expected,
  nql: (value, expected) => value !== expected,
  lt: (value, expected) => value < expected,
  gt: (value, expected) => value > expected,
  lte: (value, expected) => value <= expected,
  gte: (value, expected) => value >= expected,
  truthy: (value) => !!value,
  falsy: (value) => !value,
  match: (value, expected) => expected.test(value),
  contains: (value, expected) => value.indexOf(expected) !== -1,
}

function conditionsPass(conObj, data) {
  return Object.keys(conObj).every(key => {
    const [valueName, expectedValue] = conObj[key]
    return comparisons[key](data[valueName], expectedValue)
  })
}

function collectError(context, graph, err) {
  if (!context.errors) {
    context.errors = []
  }
  context.errors.push([graph[0], err.message ? err.message : err])
}

async function recursiveGraphHandler(graph, types, queries, req={}, parentData=null, context={}) {

  // Ensure the graph is an array,
  // its first item is a query name,
  // and the query is allowed
  ensure.valueIsArray(graph)
  ensure.valueIsCallName(graph[0])
  ensure.valueIsAllowedQueryName(graph[0], queries)

  // If we want to compose calls, compose them and recurse.
  if (graph[0] === "::compose") {
    const composeOut = []
    await Promise.all(graph.slice(1).map(async (composeChild) => {
      composeChild = typeof composeChild === "string" ? [composeChild] : composeChild;
      const resolved = await recursiveGraphHandler(composeChild, types, queries, req, parentData, context)
      composeOut.push(resolved)
    }))
    return composeOut
  }

  // Get the separate parts of the graph: query, args, children
  const hasArgs = isPlainObject(graph[1])
  const query = queries[graph[0]]
  const args = hasArgs ? graph[1] : null
  const children = graph.slice(hasArgs ? 2 : 1)

  // Ensure that children are written in the proper format
  // and that any args match their expected types.
  children.forEach(child => ensure.childTypeOk(child))
  if (query.expect) {
    ensure.argsOk(args, query.expect)
  }

  const typeObject = buildTypeObject(query.type)
  const typeName = typeObject.name
  const shouldUseCustomType = !typeObject.isNative

  // If the query expects to return a custom type, ensure that type is defined
  if (shouldUseCustomType) {
    ensure.typeNameIsValidCustomType(typeName, types)
  }

  // Make the call and resolve the data
  let data
  try {
    data = await query.resolve({ args: args || {}, context, data: parentData })
  } catch (dataErr) {
    collectError(context, graph, dataErr)
    return { [graph[0]]: null }
  }

  // If the query expects to return a native type, ensure the data matches the type
  // then return the data object where the data is labeled by the call name.
  if (!shouldUseCustomType) {
    ensure.dataMatchesNativeType(data, typeObject, !!children.length)
    return { [graph[0]]: data }
  }

  // If the data is a custom type, ensure the graph asks for children.
  // For each child, recursively run the corresponding resolver in the custom type.
  else {
    ensure.graphHasChildren(children)
    const childQueries = types[typeName]

    const recursivelyHandleChildren = async (children, rawData) => {
      const realChildren = []
      const conditions = []
      const out = {}

      children.forEach(child => (child[0] === "::when" ? conditions : realChildren).push(child))

      const iterator = async (child) => {
        const childGraph = typeof child === "string" ? [child] : child;
        const childName = childGraph[0]

        const childData = await recursiveGraphHandler(childGraph, types, childQueries, req, rawData, context)
        objectLoop(childData, (val, key) => out[key] = val)
      }

      await Promise.all(realChildren.map(iterator))

      const additions = []
      conditions.forEach(condition => {
        if (conditionsPass(condition[1], out)) {
          Array.prototype.push.apply(additions, condition.slice(2))
        }
      })

      await Promise.all(additions.map(iterator))

      return out
    }

    if (typeObject.isArray) {
      ensure.valueIsArray(data)
      const out = []

      await Promise.all(data.map(async (dataItem) => {
        const resolvedItem = await recursivelyHandleChildren(children, dataItem)
        out.push(resolvedItem)
      }))

      // Once the data is collected, return it in an object labeled by the call name.
      return { [graph[0]]: out }

    } else {
      const out = await recursivelyHandleChildren(children, data)
      return { [graph[0]]: out }
    }
  }
}

async function handleGraph(graph, types, queries, req={}) {
  const context = {}
  try {
    const result = await recursiveGraphHandler(graph, types, queries, req, null, context)
    const out = { data: result }
    if (context.errors && context.errors.length) {
      out.errors = context.errors
    }
    return out
  } catch (err) {
    return { errors: [["processingError", err.message]] }
  }
}

module.exports = handleGraph
