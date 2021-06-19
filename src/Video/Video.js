import React, { Component } from "react"
import io from "socket.io-client"
import faker from "faker"
import "antd/dist/antd.css"
import { Input, Button } from "@material-ui/core"
import { Row } from "reactstrap"
import "bootstrap/dist/css/bootstrap.css"
import "./Video.css"

const server_url = "http://localhost:4001"

var connections = {}
const peerConnectionConfig = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
}
var socket = null
var socketId = null
var elms = 0

class Video extends Component {
  constructor(props) {
    super(props)

    this.localVideoref = React.createRef()

    this.videoAvailable = false
    this.audioAvailable = false

    this.state = {
      video: true,
      audio: true,
      screen: false,
      showModal: false,
      screenAvailable: false,
      messages: [],
      message: "",
      newmessages: 0,
      askForUsername: true,
      username: faker.internet.userName(),
    }
    connections = {}

    this.getPermissions()
  }

  getPermissions = async () => {
    try {
      await navigator.mediaDevices
        .getUserMedia({ video: true })
        .then(() => (this.videoAvailable = true))
        .catch(() => (this.videoAvailable = false))

      await navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then(() => (this.audioAvailable = true))
        .catch(() => (this.audioAvailable = false))

      if (navigator.mediaDevices.getDisplayMedia) {
        this.setState({ screenAvailable: true })
      } else {
        this.setState({ screenAvailable: false })
      }

      if (this.videoAvailable || this.audioAvailable) {
        navigator.mediaDevices
          .getUserMedia({
            video: this.videoAvailable,
            audio: this.audioAvailable,
          })
          .then(stream => {
            window.localStream = stream
            this.localVideoref.current.srcObject = stream
          })
          .then(stream => {})
          .catch(e => console.log(e))
      }
    } catch (e) {
      console.log(e)
    }
  }

  getMedia = () => {
    this.setState(
      {
        video: this.videoAvailable,
        audio: this.audioAvailable,
      },
      () => {
        this.getUserMedia()
        this.connectToSocketServer()
      }
    )
  }

  getUserMedia = () => {
    if (
      (this.state.video && this.videoAvailable) ||
      (this.state.audio && this.audioAvailable)
    ) {
      navigator.mediaDevices
        .getUserMedia({ video: this.state.video, audio: this.state.audio })
        .then(this.getUserMediaSuccess)
        .then(stream => {})
        .catch(e => console.log(e))
    } else {
      try {
        let tracks = this.localVideoref.current.srcObject.getTracks()
        tracks.forEach(track => track.stop())
      } catch (e) {}
    }
  }

  getUserMediaSuccess = stream => {
    try {
      window.localStream.getTracks().forEach(track => track.stop())
    } catch (e) {
      console.log(e)
    }

    window.localStream = stream
    this.localVideoref.current.srcObject = stream

    for (let id in connections) {
      if (id === socketId) continue

      connections[id].addStream(window.localStream)

      connections[id].createOffer().then(description => {
        connections[id]
          .setLocalDescription(description)
          .then(() => {
            socket.emit(
              "signal",
              id,
              JSON.stringify({ sdp: connections[id].localDescription })
            )
          })
          .catch(e => console.log(e))
      })
    }

    stream.getTracks().forEach(
      track =>
        (track.onended = () => {
          this.setState(
            {
              video: false,
              audio: false,
            },
            () => {
              try {
                let tracks = this.localVideoref.current.srcObject.getTracks()
                tracks.forEach(track => track.stop())
              } catch (e) {
                console.log(e)
              }

              for (let id in connections) {
                connections[id].addStream(window.localStream)

                connections[id].createOffer().then(description => {
                  connections[id]
                    .setLocalDescription(description)
                    .then(() => {
                      socket.emit(
                        "signal",
                        id,
                        JSON.stringify({
                          sdp: connections[id].localDescription,
                        })
                      )
                    })
                    .catch(e => console.log(e))
                })
              }
            }
          )
        })
    )
  }

  getDislayMedia = () => {
    if (this.state.screen) {
      if (navigator.mediaDevices.getDisplayMedia) {
        navigator.mediaDevices
          .getDisplayMedia({ video: true, audio: true })
          .then(this.getDislayMediaSuccess)
          .then(stream => {})
          .catch(e => console.log(e))
      }
    }
  }

  getDislayMediaSuccess = stream => {
    try {
      window.localStream.getTracks().forEach(track => track.stop())
    } catch (e) {
      console.log(e)
    }

    window.localStream = stream
    this.localVideoref.current.srcObject = stream

    for (let id in connections) {
      if (id === socketId) continue

      connections[id].addStream(window.localStream)

      connections[id].createOffer().then(description => {
        connections[id]
          .setLocalDescription(description)
          .then(() => {
            socket.emit(
              "signal",
              id,
              JSON.stringify({ sdp: connections[id].localDescription })
            )
          })
          .catch(e => console.log(e))
      })
    }

    stream.getTracks().forEach(
      track =>
        (track.onended = () => {
          this.setState(
            {
              screen: false,
            },
            () => {
              try {
                let tracks = this.localVideoref.current.srcObject.getTracks()
                tracks.forEach(track => track.stop())
              } catch (e) {
                console.log(e)
              }

              this.getUserMedia()
            }
          )
        })
    )
  }

  gotMessageFromServer = (fromId, message) => {
    var signal = JSON.parse(message)

    if (fromId !== socketId) {
      if (signal.sdp) {
        connections[fromId]
          .setRemoteDescription(new RTCSessionDescription(signal.sdp))
          .then(() => {
            if (signal.sdp.type === "offer") {
              connections[fromId]
                .createAnswer()
                .then(description => {
                  connections[fromId]
                    .setLocalDescription(description)
                    .then(() => {
                      socket.emit(
                        "signal",
                        fromId,
                        JSON.stringify({
                          sdp: connections[fromId].localDescription,
                        })
                      )
                    })
                    .catch(e => console.log(e))
                })
                .catch(e => console.log(e))
            }
          })
          .catch(e => console.log(e))
      }

      if (signal.ice) {
        connections[fromId]
          .addIceCandidate(new RTCIceCandidate(signal.ice))
          .catch(e => console.log(e))
      }
    }
  }

  handleVideoLayout = main => {
    let widthMain = main.offsetWidth
    let minWidth = "30%"
    if ((widthMain * 30) / 100 < 300) {
      minWidth = "300px"
    }
    let minHeight = "40%"

    let height = String(100 / elms) + "%"
    let width = ""
    if (elms === 0 || elms === 1) {
      width = "100%"
      height = "100%"
    } else if (elms === 2) {
      width = "45%"
      height = "100%"
    } else if (elms === 3 || elms === 4) {
      width = "35%"
      height = "50%"
    } else {
      width = String(100 / elms) + "%"
    }

    let videos = main.querySelectorAll("video")
    for (let a = 0; a < videos.length; ++a) {
      videos[a].style.minWidth = minWidth
      videos[a].style.minHeight = minHeight
      videos[a].style.setProperty("width", width)
      videos[a].style.setProperty("height", height)
    }

    return { minWidth, minHeight, width, height }
  }

  connectToSocketServer = () => {
    socket = io.connect(server_url, { secure: true })

    socket.on("signal", this.gotMessageFromServer)

    socket.on("connect", () => {
      socket.emit("join-call", window.location.href)
      socketId = socket.id

      socket.on("chat-message", this.addMessage)

      socket.on("user-left", id => {
        let video = document.querySelector(`[data-socket="${id}"]`)
        if (video !== null) {
          elms--
          video.parentNode.removeChild(video)

          let main = document.getElementById("main")
          this.handleVideoLayout(main)
        }
      })

      socket.on("user-joined", (id, clients) => {
        clients.forEach(socketListId => {
          connections[socketListId] = new RTCPeerConnection(
            peerConnectionConfig
          )
          // Wait for their ice candidate
          connections[socketListId].onicecandidate = function (event) {
            if (event.candidate != null) {
              socket.emit(
                "signal",
                socketListId,
                JSON.stringify({ ice: event.candidate })
              )
            }
          }

          // Wait for their video stream
          connections[socketListId].onaddstream = event => {
            var searchVidep = document.querySelector(
              `[data-socket="${socketListId}"]`
            )
            if (searchVidep !== null) {
              // To avoid empty stream
              searchVidep.srcObject = event.stream
            } else {
              elms = clients.length
              let main = document.getElementById("main")
              let cssMesure = this.handleVideoLayout(main)

              let video = document.createElement("video")

              let css = {
                minWidth: cssMesure.minWidth,
                minHeight: cssMesure.minHeight,
                maxHeight: "100%",
                margin: "10px",
                borderStyle: "solid",
                borderColor: "#bdbdbd",
                objectFit: "fill",
              }
              for (let i in css) video.style[i] = css[i]

              video.style.setProperty("width", cssMesure.width)
              video.style.setProperty("height", cssMesure.height)
              video.setAttribute("data-socket", socketListId)
              video.srcObject = event.stream
              video.autoplay = true
              video.playsinline = true

              main.appendChild(video)
            }
          }

          // Add the local video stream
          if (window.localStream !== undefined && window.localStream !== null) {
            connections[socketListId].addStream(window.localStream)
          } else {
            //think about the situation when services are blocked
          }
        })

        if (id === socketId) {
          for (let id2 in connections) {
            if (id2 === socketId) continue

            try {
              connections[id2].addStream(window.localStream)
            } catch (e) {}

            connections[id2].createOffer().then(description => {
              connections[id2]
                .setLocalDescription(description)
                .then(() => {
                  socket.emit(
                    "signal",
                    id2,
                    JSON.stringify({ sdp: connections[id2].localDescription })
                  )
                })
                .catch(e => console.log(e))
            })
          }
        }
      })
    })
  }

  connect = () =>
    this.setState({ askForUsername: false }, () => this.getMedia())

  render() {
    return (
      <div>
        {this.state.askForUsername === true ? (
          <div>
            <div
              style={{
                background: "white",
                width: "30%",
                height: "auto",
                padding: "20px",
                minWidth: "400px",
                textAlign: "center",
                margin: "auto",
                marginTop: "50px",
                justifyContent: "center",
              }}
            >
              <Button
                variant='contained'
                color='primary'
                onClick={this.connect}
                style={{ margin: "20px" }}
              >
                Connect
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <div className='container'>
              <Row
                id='main'
                className='flex-container'
                style={{ margin: 0, padding: 0 }}
              >
                <video
                  id='my-video'
                  ref={this.localVideoref}
                  autoPlay
                  muted
                  style={{
                    borderStyle: "solid",
                    borderColor: "#bdbdbd",
                    margin: "10px",
                    objectFit: "fill",
                    width: "100%",
                    height: "100%",
                  }}
                ></video>
              </Row>
            </div>
          </div>
        )}
      </div>
    )
  }
}

export default Video
