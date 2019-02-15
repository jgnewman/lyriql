const helpers = {

  isPlainObject(value) {
    return Object.prototype.toString.call(value) === '[object Object]'
  },

  isAllowedNativeType(cleanTypeName) {
    switch (cleanTypeName) {
      case "Object":
      case "String":
      case "Number":
      case "Boolean":
        return true
      default:
        return false
    }
  },

  objectLoop(obj, iterator) {
    Object.keys(obj).forEach((key) => iterator(obj[key], key))
  },

  valueMatchesAllowedNativeType(value, expectedType) {
    const valueType = typeof value
    expectedType = expectedType.toLowerCase()

    if (valueType !== "object") {
      return valueType === expectedType
    } else {
      return expectedType === "object" && helpers.isPlainObject(value)
    }
  },

}

module.exports = helpers
