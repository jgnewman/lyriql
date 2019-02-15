const fs = require("fs")
const path = require("path")
const handleGraph = require("./handle-graph")

function getUI() {
  return new Promise((resolve, reject) => {
    const ui = fs.readFile(path.resolve(__dirname, './ui-template.html'), (err, data) => {
      if (err) return reject(err)
      return resolve(data.toString())
    })
  })
}

function expressLyriql(types, queries, options={}) {
  if (!types) {
    throw new Error("LyriQL middleware requires a custom types object")
  }

  if (!queries) {
    throw new Error("LyriQL middleware requires a queries object")
  }

  return async (req, res) => {
    if (req.method !== "GET" && req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      res.statusCode = 405
      return res.send({ error: "LyriQL middleware only supports GET and POST requests" })
    }

    if (options.ui && req.path === "/ui") {
      const ui = await getUI()
      return res.send(ui)
    }

    let graph = null

    if (req.method === "GET") {
      graph = req.query.graph // i.e. /lyriql?graph=${graph}
      if (graph[0] === "%") {
        graph = decodeURIComponent(graph)
      }
    }

    else if (req.method === "POST") {
      graph = req.body
    }

    try {

      if (typeof graph === "string") {
        graph = JSON.parse(graph)
      }

      const result = await handleGraph(graph, types, queries, req)

      res.statusCode = 200

      res.send(result)

    } catch (err) {
      res.statusCode = 500
      res.send({ error: err.message ? err.message : err.toString() })
    }
  }
}

module.exports = { getUI, expressLyriql }
