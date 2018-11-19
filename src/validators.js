const OK = Symbol.for('HARKERQL_OK_SYMBOL')

function checkNativeType(value, typename) {
  switch (typename) {
    case 'date': return value instanceof Date;
    case 'array': return Array.isArray(value);
    case 'object': return typeof value === 'object' && !Array.isArray(value)
    default: return typeof value === typename;
  }
}

class Expecter {
  constructor(type) {
    this.type = type
    this.isNative = typeof type === 'function'
    this.isArray = Array.isArray(type)
    this.isTypeChecker = OK
  }

  typeMismatch(node, correctType=this.type) {
    return `Value for field "${node.label}" does not match type "${correctType}"`
  }

  nullMismatch() {
    const typeName = this.isNative ? this.type.name : this.type
    return `Cannot return null for type "${typeName}"`
  }

  validateNativeType(val) {
    if (!this.isNative) return false
    return checkNativeType(val, this.type.name.toLowerCase())
  }

  validate(node, val) {
    if (val === null) return OK

    if (this.isNative) {
      const typename = this.type.name.toLowerCase()
      const matches = checkNativeType(val, typename)
      return matches ? OK : this.typeMismatch(node, this.type.name)
    }

    if (this.isArray) {
      const valIsArray = Array.isArray(val)
      return valIsArray ? OK : this.typeMismatch(node, 'Array')
    }

    return OK
  }
}

class Demander extends Expecter {
  validate(node, val) {
    const validated = super.validate(node, val)
    return (validated === OK && val === null) ? this.nullMismatch() : validated
  }
}

class Validate {

  // request contains correct params (amount, names, types)
  static validParams(node, schemaChunk) {
    const paramKeys = Object.keys(node.params)

    if (!schemaChunk.params) {
      return !paramKeys.length ? OK : `Unexpected parameters provided for field "${node.label}"`
    }

    const schemaParamKeys = Object.keys(schemaChunk.params)
    if (schemaParamKeys.length !== paramKeys.length) {
      return `Wrong number of parameters provided for field "${node.label}"`
    }

    let foundProblem = null
    paramKeys.some(key => {
      const val = node.params[key]
      const typeChecker = schemaChunk.params[key]

      if (!typeChecker) {
        return foundProblem = `Unexpected parameter "${key}" for field "${node.label}"`
      }

      if (!typeChecker.validateNativeType(val)) {
        return foundProblem = `Value for parameter "${key}" on field "${node.label}" is of the wrong type`
      }
    })

    if (foundProblem) return foundProblem
    return OK
  }

  // requested object spec exists in schema
  static specInSchema(typeChecker, schema) {
    if (typeChecker.isNative || schema[typeChecker.type]) return OK
    return `Schema does not contain a specification for "${typeChecker.type}"`
  }

  // requested object spec exists in resolver
  static specInResolver(typeChecker, resolver) {
    if (typeChecker.isNative || resolver[typeChecker.type]) return OK
    return `Resolver does not contain a specification for "${typeChecker.type}"`
  }

  // requested field exists in schema type
  static fieldInSchema(node, schemaChunk) {
    if (schemaChunk.hasOwnProperty(node.label)) return OK
    return `Field "${node.label}" does not exist in schema`
  }

  // requested field exists in resolver type
  static fieldInResolver(node, resolverChunk) {
    if (resolverChunk.hasOwnProperty(node.label)) return OK
    return `Field "${node.label}" does not exist in resolver`
  }

  // returned data for field is of correct type
  static dataMatchesType(node, rawData, typeChecker) {
    return typeChecker.validate(node, rawData)
  }
}

module.exports = {
  Expecter,
  Demander,
  Validate,
  OK,
}
