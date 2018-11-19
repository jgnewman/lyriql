const getAST = require('./ast-builder')
const { Demander, Validate, OK } = require('./validators')

class RequestHandler {

  constructor(requestText, schema, resolver, httpReq) {
    this.requestText = requestText
    this.schema = schema
    this.rootResolver = resolver
    this.httpReq = httpReq
    this.requestContext = { req: httpReq }
  }

  errorForProblem(validationResult) {
    if (validationResult !== OK) {
      throw new Error(validationResult)
    }
  }

  buildLocalContext(node, schemaChunk, data) {
    this.errorForProblem(Validate.validParams(node, schemaChunk[node.label]))

    return {
      data: data,
      params: node.params
    }
  }

  resolveTypeChecker(possibleTypeChecker) {
    if (possibleTypeChecker.isTypeChecker === OK) return possibleTypeChecker
    return possibleTypeChecker.data
  }

  async resolveNodeBody(node, typeChecker, data) {
    const out = {}
    await Promise.all(node.body.map(async (subNode) => {
      out[subNode.label] = await this.resolveNode(subNode, typeChecker, data)
    }))
    return out
  }

  async resolveNode(node, schemaType=new Demander('Root'), data=null) {
    const expectsArray = Array.isArray(schemaType.type)

    if (expectsArray) {
      schemaType = schemaType.type[0]
    }

    this.errorForProblem(Validate.specInSchema(schemaType, this.schema))
    this.errorForProblem(Validate.specInResolver(schemaType, this.rootResolver))

    const schema = this.schema[schemaType.type]
    const resolver = this.rootResolver[schemaType.type]

    this.errorForProblem(Validate.fieldInSchema(node, schema))
    this.errorForProblem(Validate.fieldInResolver(node, resolver))

    const localContext = this.buildLocalContext(node, schema, data)
    const typeChecker = this.resolveTypeChecker(schema[node.label])
    const resolvedData = await resolver[node.label](localContext, this.requestContext)

    this.errorForProblem(Validate.dataMatchesType(node, resolvedData, typeChecker))

    if (!node.body || !node.body.length) {
      return resolvedData
    }

    const resolvedDataIsArray = Array.isArray(resolvedData)

    if (!resolvedDataIsArray) {
      return this.resolveNodeBody(node, typeChecker, resolvedData)
    }

    const outArray = []
    await Promise.all(resolvedData.map(async (dataChunk) => {
      const out = await this.resolveNodeBody(node, typeChecker, dataChunk)
      outArray.push(out)
    }))

    return outArray
  }

  async resolveRequest() {
    try {
      const ast = getAST(this.requestText)
      const out = { data: null }

      if (ast instanceof Error) {
        throw ast
      }

      if (ast.body.length > 1) {
        out.data = await Promise.all(ast.body.map(node => this.resolveNode(node)))
      } else {
        out.data = await this.resolveNode(ast.body[0])
      }

      return out
    } catch (err) {
      return {
        error: err && err.message ? err.message : err
      }
    }
  }
}

module.exports = RequestHandler
