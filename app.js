const express = require("express")
const http = require("http")
var cors = require("cors")
const app = express()
const bodyParser = require("body-parser")
const path = require("path")
var xss = require("xss")

var server = http.createServer(app)
var io = require("socket.io")(server)

app.use(cors())
app.use(bodyParser.json())

app.use(express.static(__dirname + "/build"))
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname + "/build/index.html"))
})

app.set("port", process.env.PORT || 4001)

server.listen(app.get("port"), () => {
  console.log("listening on", app.get("port"))
})
