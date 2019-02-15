const assert = require("assert")
const index = require("../src/index")

describe("index", function() {
  it("exports a function for #handleGraph", function() {
    assert.ok(typeof index.handleGraph === "function")
  })

  it("exports a function for #getUI", function() {
    assert.ok(typeof index.getUI === "function")
  })

  it("exports a function for #expressLyriql", function() {
    assert.ok(typeof index.expressLyriql === "function")
  })
})
