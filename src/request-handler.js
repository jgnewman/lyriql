const getAST = require('./ast-builder')
const { Demander, Validate, OK } = require('./validators')

class RequestHandler {

  constructor(requestText, spec, httpReq) {
    this.requestText = requestText
    this.spec = spec
    this.requestContext = { request: httpReq }
  }

  errorForProblem(validationResult) {
    if (validationResult !== OK) {
      throw new Error(validationResult)
    }
  }

  buildLocalContext(node, specChunk, data) {
    this.errorForProblem(Validate.validParams(node, specChunk[node.label]))

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

  async resolveNode(node, specType=new Demander('Root'), data=null) {
    const expectsArray = Array.isArray(specType.type)

    if (expectsArray) {
      specType = specType.type[0]
    }

    this.errorForProblem(Validate.specTypeExists(specType, this.spec))

    const specChunk = this.spec[specType.type]

    this.errorForProblem(Validate.fieldInSpecChunk(node, specChunk))

    const localContext = this.buildLocalContext(node, specChunk, data)
    const typeChecker = this.resolveTypeChecker(specChunk[node.label].type)

    const resolvedData = await specChunk[node.label].resolve(localContext, this.requestContext)
    const resolvedDataIsArray = Array.isArray(resolvedData)

    this.errorForProblem(Validate.dataMatchesType(node, resolvedData, typeChecker))

    if (typeChecker.isArray && resolvedDataIsArray) {
      this.errorForProblem(Validate.fieldsRequestedForObjectArray(node, resolvedData))
    }

    if (!node.body || !node.body.length) {
      this.errorForProblem(Validate.typeDoesNotRequireNodeBody(node, typeChecker))
      return resolvedData
    }

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
