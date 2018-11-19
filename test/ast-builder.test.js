const assert = require('assert')
const getAST = require('../src/ast-builder')

describe('ast-builder', function () {

  context('when not given a block', function () {
    it('returns an error', function () {
      const code = `
        foo
        bar
      `
      const ast = getAST(code)
      assert.ok(ast instanceof Error)
    })
  })

  context('when given a block', function () {
    it('returns an ast', function () {
      const code = `{}`
      const ast = getAST(code)
      assert.equal(ast.type, 'Root')
    })
  })

  context('when comments are present', function () {
    it('ignores comments at the top level', function () {
      const code = `
        # comment
        {
          foo
        }
      `
      const ast = getAST(code)
      assert.equal(ast.type, 'Root')
    })

    it('ignores comments at the root level', function () {
      const code = `
        {
          # comment
          foo # comment
          # comment
        }
      `
      const ast = getAST(code)
      assert.equal(ast.body.length, 1)
    })

    it('ignores comments at the nested level', function () {
      const code = `
        {
          foo {
            # comment
            bar
          }
        }
      `
      const ast = getAST(code)
      assert.equal(ast.body[0].body.length, 1)
    })
  })

  context('when arguments are given', function () {
    it('returns an ast with the right number of body nodes', function () {
      const code = `{
        foo
        bar
      }`
      const ast = getAST(code)
      assert.equal(ast.body.length, 2)
    })
  })

  context('when no arguments are given', function () {
    it('still returns an empty array of body nodes', function () {
      const code = `{}`
      const ast = getAST(code)
      assert.ok(Array.isArray(ast.body))
      assert.equal(ast.body.length, 0)
    })
  })

  context('when no parameters are given', function () {
    it('returns an empty array of parameter nodes', function () {
      const code = `{
        foo
      }`
      const ast = getAST(code).body[0]
      assert.equal(typeof ast.params, 'object')
      assert.equal(Object.keys(ast.params).length, 0)
    })
  })

  context('when parameters are given', function () {
    it('populates a parameters array', function () {
      const code = `{
        foo(a:a, b:b)
      }`
      const ast = getAST(code).body[0]
      assert.equal(typeof ast.params, 'object')
      assert.equal(Object.keys(ast.params).length, 2)
    })

    it('correctly parses single quoted string params', function () {
      const code = `{
        foo(a: 'bar')
      }`
      const ast = getAST(code).body[0]
      assert.equal(ast.params.a, 'bar')
    })

    it('correctly parses double quoted string params', function () {
      const code = `{
        foo(a: "bar")
      }`
      const ast = getAST(code).body[0]
      assert.equal(ast.params.a, 'bar')
    })

    it('does not require quoting string params', function () {
      const code = `{
        foo(a: bar)
      }`
      const ast = getAST(code).body[0]
      assert.equal(ast.params.a, 'bar')
    })

    it('correctly parses numeric params', function () {
      const code = `{
        foo(a: 123)
      }`
      const ast = getAST(code).body[0]
      assert.equal(ast.params.a, 123)
    })

    it('correctly parses float params', function () {
      const code = `{
        foo(a: 12.3)
      }`
      const ast = getAST(code).body[0]
      assert.equal(ast.params.a, 12.3)
    })

    it('correctly parses object params', function () {
      const code = `{
        foo(a: {"bar": "baz"})
      }`
      const ast = getAST(code).body[0]
      assert.deepEqual(ast.params.a, {bar: 'baz'})
    })

    it('correctly parses array params', function () {
      const code = `{
        foo(a: [{"bar": "baz"}])
      }`
      const ast = getAST(code).body[0]
      assert.deepEqual(ast.params.a, [{bar: 'baz'}])
    })

    it('correctly parses null params', function () {
      const code = `{
        foo(a: null)
      }`
      const ast = getAST(code).body[0]
      assert.equal(ast.params.a, null)
    })

    it('correctly parses boolean params', function () {
      const code = `{
        foo(a: true)
      }`
      const ast = getAST(code).body[0]
      assert.equal(ast.params.a, true)
    })
  })


})
