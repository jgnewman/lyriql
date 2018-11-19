const { parser } = require('./parser')

const commonPrototype = {

  stripComments() {
    this.body = this.body.filter(item => item.type !== 'Comment')
    return this
  }

}

parser.nodes.RootNode.prototype = {
  ...commonPrototype,

  clean() {
    this.stripComments()
    this.body.forEach(item => item.clean())

    if (this.body.length !== 1 || this.body[0].type !== 'Block') {
      throw new Error('Query body must contain a single root block')
    }

    this.body = this.body[0].body
    return this
  },
}

parser.nodes.BlockNode.prototype = {
  ...commonPrototype,

  clean() {
    this.stripComments()
    this.body.forEach(item => item.clean())
    return this
  },
}

parser.nodes.DataSpecNode.prototype = {
  parseValue(val) {
    try {
      return JSON.parse(val)
    } catch (_) {
      return val.replace(/^'|'$/g, '')
    }
  },

  parseParams() {
    const KEY = 'KEY'
    const VAL = 'VAL'

    const out = {}

    let blocks = 0
    let buildingType = KEY
    let currentKey = ''
    let currentVal = ''

    for (let i = 0; i < this.params.length; i += 1) {
      const char = this.params[i]

      switch (char) {

        case ':':
          if (!blocks) {
            buildingType = VAL
            break
          }

        case ',':
          if (!blocks) {
            buildingType = KEY
            out[currentKey.trim()] = this.parseValue(currentVal.trim())
            currentKey = ''
            currentVal = ''
            break
          }

        default:

          if (char === '{' || char === '[') {
            blocks += 1
          }

          else if (char === '}' || char === ']') {
            blocks += 1
          }

          buildingType === KEY ? (currentKey += char) : (currentVal += char)
      }
    }

    const trimmedKey = currentKey.trim()
    if (trimmedKey) {
      out[trimmedKey] = this.parseValue(currentVal.trim())
    }

    return out
  },

  clean() {
    this.params = this.parseParams()

    if (this.body) {
      this.body.clean()
      this.body = this.body.body
    } else {
      this.body = []
    }

    return this
  }
}

function getAST(code) {
  let ast
  try {
    ast = parser.parse(code)
  } catch (err) {
    return err
  }
  return ast.clean()
}

module.exports = getAST
