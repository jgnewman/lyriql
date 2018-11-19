const fs = require('fs')
const path = require('path')
const jison = require('jison')

try {
  const jisonData = fs.readFileSync(path.resolve(__dirname, '../src/grammar.jison'))
  const parser = new jison.Parser(jisonData.toString())
  const parserText = parser.generate()
  fs.writeFileSync(path.resolve(__dirname, '../src/parser.js'), parserText)
  console.log('Done.')
} catch (err) {
  console.log(err)
  process.exit(1)
}
