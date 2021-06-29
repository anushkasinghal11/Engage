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

if (process.env.NODE_ENV === "production") {
  app.use(express.static(__dirname + "/build"))
  app.get("*", (req, res, next) => {
    res.sendFile(path.join(__dirname + "/build/index.html"))
  })
}

app.set("port", process.env.PORT || 4001)

sanitizeString = str => {
  return xss(str)
}

connections = {}
messages = {}
timeOnline = {}
participants = {}

io.on("connection", socket => {
  // socket.on("add-name", (username, path) => {
  //   if (participants[path] === undefined) participants[path] = []
  //   participants[path].push(username)
  //   console.log("members", participants[path])
  //   socket.emit("participants-array", participants[path])
  // })
  socket.on("send-chattheme", color => {
    socket.broadcast.emit("chat-color", color)
  })
  socket.on("user-filter", filter => {
    var key
    for (const [k, v] of JSON.parse(
      JSON.stringify(Object.entries(connections))
    )) {
      for (let a = 0; a < v.length; ++a) {
        if (v[a] === socket.id) {
          key = k

          for (let a = 0; a < connections[key].length; ++a) {
            io.to(connections[key][a]).emit("photo-filter", socket.id, filter)
          }
        }
      }
    }
  })

  socket.on("send-username2", username => {
    var path
    for (const [k, v] of JSON.parse(
      JSON.stringify(Object.entries(connections))
    )) {
      for (let a = 0; a < v.length; ++a) {
        if (v[a] === socket.id) {
          path = k
          for (let a = 0; a < connections[path].length; ++a) {
            if (connections[path][a] !== socket.id)
              io.to(connections[path][a]).emit(
                "leave-notification",
                `${username} has left the call`
              )
          }
        }
      }
    }
  })

  socket.on("send-username-hand", username => {
    var path
    for (const [k, v] of JSON.parse(
      JSON.stringify(Object.entries(connections))
    )) {
      for (let a = 0; a < v.length; ++a) {
        if (v[a] === socket.id) {
          path = k
          for (let a = 0; a < connections[path].length; ++a) {
            if (connections[path][a] !== socket.id)
              io.to(connections[path][a]).emit(
                "hand-raise",
                `${username} has raised their hand`
              )
          }
        }
      }
    }
  })
  socket.on("join-call", path => {
    if (connections[path] === undefined) {
      connections[path] = []
    }

    connections[path].push(socket.id)

    timeOnline[socket.id] = new Date()

    for (let a = 0; a < connections[path].length; ++a) {
      io.to(connections[path][a]).emit(
        "user-joined",
        socket.id,
        connections[path]
      )
      // io.to(connections[path][a]).emit(
      //   "chat-message",
      //   "New user Joined",
      //   "admin"
      // )
    }

    socket.on("send-username", username => {
      for (let a = 0; a < connections[path].length; ++a) {
        if (connections[path][a] !== socket.id)
          io.to(connections[path][a]).emit(
            "join-notification",
            `${username} has joined the call`
          )
      }
    })

    if (messages[path] !== undefined) {
      for (let a = 0; a < messages[path].length; ++a) {
        io.to(socket.id).emit(
          "chat-message",
          messages[path][a]["data"],
          messages[path][a]["sender"],
          messages[path][a]["socket-id-sender"]
        )
      }
    }

    console.log(path, connections[path])
  })

  socket.on("signal", (toId, message) => {
    io.to(toId).emit("signal", socket.id, message)
  })

  socket.on("chat-message", (data, sender) => {
    var key
    var ok = false
    for (const [k, v] of Object.entries(connections)) {
      for (let a = 0; a < v.length; ++a) {
        if (v[a] === socket.id) {
          key = k
          ok = true
        }
      }
    }

    if (ok === true) {
      if (messages[key] === undefined) {
        messages[key] = []
      }
      messages[key].push({
        sender: sender,
        data: data,
        "socket-id-sender": socket.id,
      })
      console.log("message", key, ":", sender, data)

      for (let a = 0; a < connections[key].length; ++a) {
        io.to(connections[key][a]).emit("chat-message", data, sender, socket.id)
      }
    }
  })

  socket.on("disconnect", () => {
    var key
    for (const [k, v] of JSON.parse(
      JSON.stringify(Object.entries(connections))
    )) {
      for (let a = 0; a < v.length; ++a) {
        if (v[a] === socket.id) {
          key = k

          for (let a = 0; a < connections[key].length; ++a) {
            io.to(connections[key][a]).emit("user-left", socket.id)
          }

          var index = connections[key].indexOf(socket.id)
          connections[key].splice(index, 1)

          if (connections[key].length === 0) {
            delete connections[key]
          }
        }
      }
    }
  })
})

server.listen(app.get("port"), () => {
  console.log("listening on", app.get("port"))
})
