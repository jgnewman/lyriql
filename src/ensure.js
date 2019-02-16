const {
  objectLoop,
  isPlainObject,
  valueMatchesAllowedNativeType,
  buildTypeObject,
} = require("./helpers")

const err = (msg) => {
  throw new Error(msg)
}

module.exports = {

  valueIsArray(value) {
    Array.isArray(value) || err(`The value "${value}" must be an array.`)
  },

  valueIsCallName(value) {
    (typeof value === "string" && value.length) || err(`The value "${value}" must be a call name.`)
  },

  valueIsAllowedQueryName(value, allowedQueries) {
    if (Object.prototype.hasOwnProperty.call(allowedQueries, value)) {
      return
    }

    if (value === "::compose" || value === "::when") {
      return
    }

    err(`The query name "${value}" is not allowed.`)
  },

  typeNameIsValidCustomType(cleanTypeName, types) {
    if (!Object.prototype.hasOwnProperty.call(types, cleanTypeName)) {
      err(`Type name "${cleanTypeName}" is not defined.`)
    }
  },

  graphHasChildren(children) {
    (!Array.isArray(children) || !children.length) && err(`Queries on custom types require identifying children.`)
  },

  dataMatchesNativeType(data, { name, isArray, isRequired }, childrenRequested) {
    const typeName = name
    const dataType = typeof data

    if (childrenRequested) {
      err(`You can not request child data on native types.`)
    }

    if (isArray) {
      if (!Array.isArray(data)) {
        err(`Expected data in the form of an array but got "${dataType}" instead.`)
      }

      data.forEach(item => {
        if (!valueMatchesAllowedNativeType(item, typeName)) {
          err(`An item in a data array did not match native type "${typeName}".`)
        }
      })

      return
    }

    if (data === null && !isRequired) {
      if (!isRequired) {
        return
      }
      err(`Can not return a null value for required type.`)
    }

    if (valueMatchesAllowedNativeType(data, typeName)) {
      return
    }

    err(`Data type "${dataType}" does not match expected type "${typeName}".`)
  },

  childTypeOk(value) {
    (typeof value === "string" || Array.isArray(value)) || err(`Children in a graph must be strings or arrays.`)
  },

  argsOk(args, expected) {
    const hasExpectations = Object.keys(expected).length

    if (!hasExpectations) {
      return
    }

    !isPlainObject(args) && err(`Args are missing or were not provided in the form of an object.`)

    objectLoop(expected, (expectedType, name) => {

      if (!args.hasOwnProperty(name)) {
        err(`Missing expected arg "${name}"`)
      }

      const arg = args[name]
      const type = buildTypeObject(expectedType)

      if (type.isRequired && arg === null) {
        err(`Arg "${name}" can not be null.`)
      }

      if (type.isArray) {
        if (!Array.isArray(arg)) {
          err(`Arg "${name}" must be an array.`)
        }

        arg.forEach(item => {
          if (!valueMatchesAllowedNativeType(item, type.name)) {
            err(`Arg array item does not match type.`)
          }
        })

        return
      }

      if (!valueMatchesAllowedNativeType(arg, type.name)) {
        err(`Arg "${name}" does not match expected type.`)
      }

    })
  }

}
