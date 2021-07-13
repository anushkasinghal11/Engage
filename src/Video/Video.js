import React, { Component } from "react"
import io from "socket.io-client"
import faker from "faker"
import Tooltip from "@material-ui/core/Tooltip"
import { IconButton, Badge, Input, Button } from "@material-ui/core"
import PanToolIcon from "@material-ui/icons/PanTool"
import PanToolTwoToneIcon from "@material-ui/icons/PanToolTwoTone"
import VideocamIcon from "@material-ui/icons/Videocam"
import VideocamOffIcon from "@material-ui/icons/VideocamOff"
import MicIcon from "@material-ui/icons/Mic"
import MicOffIcon from "@material-ui/icons/MicOff"
import ScreenShareIcon from "@material-ui/icons/ScreenShare"
import StopScreenShareIcon from "@material-ui/icons/StopScreenShare"
import CallEndIcon from "@material-ui/icons/CallEnd"
import ChatIcon from "@material-ui/icons/Chat"
import GetAppIcon from "@material-ui/icons/GetApp"
import MovieFilterIcon from "@material-ui/icons/MovieFilter"
import { message } from "antd"
import "antd/dist/antd.css"

import { Row } from "reactstrap"
import Modal from "react-bootstrap/Modal"
import "bootstrap/dist/css/bootstrap.css"
import "./Video.css"

const server_url =
  process.env.NODE_ENV === "production"
    ? process.env.APP_URL
    : "http://localhost:4001"

var connections = {}

const peerConnectionConfig = {
  iceServers: [
    // { 'urls': 'stun:stun.services.mozilla.com' },
    { urls: "stun:stun.l.google.com:19302" },
  ],
}
var socket = null
var socketId = null
var elms = 0
var theRecorder
var theStream
var recordedChunks = []
//var participants=[]
class Video extends Component {
  constructor(props) {
    super(props)

    this.localVideoref = React.createRef()

    this.videoAvailable = true
    this.audioAvailable = true

    this.state = {
      hand: false,
      video: true,
      audio: true,
      screen: false,
      showModal: false,
      screenAvailable: false,
      messages: [],
      participants: [],
      message: "",
      filter: "",
      record: false,
      chatTheme: "",
      newmessages: 0,
      askForUsername: true,
      username: faker.internet.userName(),
    }
    connections = {}
    this.connectToSocketServer()
    this.getPermissions()
  }

  recordVideo = () => {
    let mediaRecorder
    let recorderBlobs
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
        //this.connectToSocketServer()
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

              // let blackSilence = (...args) =>
              //   new MediaStream([this.black(...args), this.silence()])
              // window.localStream = blackSilence()
              // this.localVideoref.current.srcObject = window.localStream

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

              // let blackSilence = (...args) =>
              //   new MediaStream([this.black(...args), this.silence()])
              // window.localStream = blackSilence()
              // this.localVideoref.current.srcObject = window.localStream

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
  notificationJoin = msg => {
    message.success(`${msg} has joined the call`)

    this.setState(prevState => ({
      participants: [...prevState.participants, msg],
    }))
  }
  notificationLeave = msg => {
    message.error(`${msg} has left the call`)
    this.setState({
      participants: this.state.participants.filter(people => people != msg),
    })
  }

  changeCssVideos = main => {
    let widthMain = main.offsetWidth
    let minWidth = "30%"
    if ((widthMain * 30) / 100 < 300) {
      minWidth = "300px"
    }
    let minHeight = "40%"

    let height = String(100 / elms) + "%"
    let width = ""
    if (elms === 0 || elms === 1) {
      width = "50%"
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
    socket.on("photo-filter", (id, filter) => {
      let video = document.querySelector(`[data-socket="${id}"]`)
      if (video !== null) {
        video.style.filter = filter
      }
      this.setState({
        participants: [...this.state.participants, this.state.username],
      })
    })

    socket.on("signal", this.gotMessageFromServer)
    socket.on("leave-notification", this.notificationLeave)
    socket.on("hand-raise", this.handNotification)

    socket.on("connect", () => {
      socket.emit("join-call", window.location.href)

      // participants.push(this.state.username)
      socket.emit("send-username", this.state.username)
      socketId = socket.id
      socket.on("join-notification", this.notificationJoin)
      socket.on("chat-message", this.addMessage)

      socket.on("user-left", id => {
        let video = document.querySelector(`[data-socket="${id}"]`)
        if (video !== null) {
          elms--
          video.parentNode.removeChild(video)

          let main = document.getElementById("main")
          this.changeCssVideos(main)
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
            // TODO mute button, full screen button
            var searchVidep = document.querySelector(
              `[data-socket="${socketListId}"]`
            )
            if (searchVidep !== null) {
              // if i don't do this check it make an empyt square
              searchVidep.srcObject = event.stream
            } else {
              elms = clients.length
              let main = document.getElementById("main")
              let cssMesure = this.changeCssVideos(main)

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
            // let blackSilence = (...args) =>
            //   new MediaStream([this.black(...args), this.silence()])
            // window.localStream = blackSilence()
            // connections[socketListId].addStream(window.localStream)
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

  silence = () => {
    let ctx = new AudioContext()
    let oscillator = ctx.createOscillator()
    let dst = oscillator.connect(ctx.createMediaStreamDestination())
    oscillator.start()
    ctx.resume()
    return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false })
  }
  black = ({ width = 640, height = 480 } = {}) => {
    let canvas = Object.assign(document.createElement("canvas"), {
      width,
      height,
    })
    canvas.getContext("2d").fillRect(0, 0, width, height)
    let stream = canvas.captureStream()
    return Object.assign(stream.getVideoTracks()[0], { enabled: false })
  }

  handleVideo = () =>
    this.setState({ video: !this.state.video }, () => this.getUserMedia())
  handleAudio = () =>
    this.setState({ audio: !this.state.audio }, () => this.getUserMedia())
  handleScreen = () =>
    this.setState({ screen: !this.state.screen }, () => this.getDislayMedia())
  handleRecord = () => {
    this.setState({ record: !this.state.record }, () => {
      if (this.state.record) this.startFunction()
      else this.download()
    })
  }
  handleEndCall = () => {
    socket.disconnect()
    try {
      let tracks = this.localVideoref.current.srcObject.getTracks()
      tracks.forEach(track => track.stop())
    } catch (e) {
      console.log(e)
    }
    this.setState({ askForUsername: true })
    socket.emit("send-username2", this.state.username)
  }

  openChat = () => this.setState({ showModal: true, newmessages: 0 })
  closeChat = () => this.setState({ showModal: false })
  handleMessage = e => this.setState({ message: e.target.value })

  addMessage = (data, sender, socketIdSender) => {
    this.setState(prevState => ({
      messages: [...prevState.messages, { sender: sender, data: data }],
    }))
    if (socketIdSender !== socketId) {
      this.setState({ newmessages: this.state.newmessages + 1 })
    }
    if (sender !== this.state.username)
      message.success(`New message from ${sender}`)
  }

  handleUsername = e => this.setState({ username: e.target.value })

  sendMessage = () => {
    if (this.state.message.length !== 0) {
      socket.emit("chat-message", this.state.message, this.state.username)
      this.setState({ message: "", sender: this.state.username })
    }
  }
  // doc_keyUp = e => {
  //   // this would test for whichever key is 40 (down arrow) and the ctrl key at the same time
  //   if (e.ctrlKey && e.key === "ArrowDown") {
  //     // call your function to do the thing
  //     this.handleAudio()
  //   }
  // }
  copyUrl = () => {
    let text = window.location.href
    if (!navigator.clipboard) {
      let textArea = document.createElement("textarea")
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      try {
        document.execCommand("copy")
        message.success("Link copied to clipboard!")
      } catch (err) {
        message.error("Failed to copy")
      }
      document.body.removeChild(textArea)
      return
    }
    navigator.clipboard.writeText(text).then(
      function () {
        message.success("Link copied to clipboard!")
      },
      () => {
        message.error("Failed to copy")
      }
    )
  }

  connect = () => {
    this.setState({ askForUsername: false }, () => {
      // this.getPermissions()
      this.getMedia()
    })
    // socket.emit("add-name", this.state.username, window.location.href)
  }

  handRaise = () => {
    socket.emit("send-username-hand", this.state.username)
  }
  handNotification = msg => {
    message.success(msg)
  }

  changeFilter = e => {
    if (this.state.video) {
      let newFilter = e.target.value
      this.setState({ filter: newFilter }, () => {
        socket.emit("user-filter", this.state.filter)
        socket.on("photo-filter", (id, filter) => {
          let video = document.querySelector(`[data-socket="${id}"]`)
          if (video !== null) {
            video.style.filter = filter
          }
        })
      })
      this.filter()
    }
  }
  filter = () => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then(this.applyFilter)
      .catch(e => {
        console.error("getUserMedia() failed: " + e)
      })
  }

  applyFilter = stream => {
    var video = document.querySelector("video")
    video.srcObject = stream
    video.style.filter = this.state.filter
  }

  isChrome = function () {
    let userAgent = (navigator && (navigator.userAgent || "")).toLowerCase()
    let vendor = (navigator && (navigator.vendor || "")).toLowerCase()
    let matchChrome = /google inc/.test(vendor)
      ? userAgent.match(/(?:chrome|crios)\/(\d+)/)
      : null
    // let matchFirefox = userAgent.match(/(?:firefox|fxios)\/(\d+)/)
    // return matchChrome !== null || matchFirefox !== null
    return matchChrome !== null
  }

  startFunction = () => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then(this.gotMedia)
      .catch(e => {
        console.error("getUserMedia() failed: " + e)
      })
  }

  gotMedia = stream => {
    theStream = stream
    var video = document.querySelector("video")
    video.srcObject = stream
    video.className = this.state.filter
    try {
      var recorder = new MediaRecorder(stream, {
        mimeType: "video/webm",
      })
    } catch (e) {
      console.error("Exception while creating MediaRecorder: " + e)
      return
    }

    theRecorder = recorder
    recorder.ondataavailable = event => {
      recordedChunks.push(event.data)
    }
    recorder.start(100)
  }

  stopFile = () => {
    theRecorder.stop()
  }

  download = () => {
    theRecorder.stop()

    var blob = new Blob(recordedChunks, {
      type: "video/webm",
    })
    var url = URL.createObjectURL(blob)
    var a = document.createElement("a")
    document.body.appendChild(a)
    a.style = "display: none"
    a.href = url
    a.download = "test.webm"
    a.click()
  }

  render() {
    if (this.isChrome() === false) {
      return (
        <div
          style={{
            background: "black",
            width: "30%",
            height: "auto",
            padding: "20px",
            minWidth: "400px",
            textAlign: "center",
            margin: "auto",
            marginTop: "50%",
            justifyContent: "center",
          }}
        >
          <h1>Sorry, this works only with Google Chrome</h1>
        </div>
      )
    }
    return (
      <div>
        {this.state.askForUsername === true ? (
          <div>
            <div
              style={{
                // background: "white",
                // width: "100%",
                height: "auto",
                padding: "20px",
                minWidth: "400px",
                textAlign: "center",
                margin: "auto",
                justifyContent: "center",
              }}
            >
              <p
                style={{ margin: 0, fontWeight: "bold", paddingRight: "50px" }}
              >
                Set your username
              </p>
              <Input
                placeholder='Username'
                value={this.state.username}
                onChange={e => this.handleUsername(e)}
              />
              <Button
                variant='contained'
                color='primary'
                onClick={this.connect}
                style={{ margin: "20px" }}
              >
                Connect
              </Button>
              <Badge
                badgeContent={this.state.newmessages}
                max={999}
                color='secondary'
                onClick={this.openChat}
              >
                <IconButton
                  style={{
                    color: "#ffffff",
                    backgroundColor: "#808080",
                    margin: "5px",
                    width: "50px",
                    height: "50px",
                  }}
                  onClick={this.openChat}
                >
                  <Tooltip title='Chat with Others'>
                    <ChatIcon />
                  </Tooltip>
                </IconButton>
              </Badge>
              <Modal
                show={this.state.showModal}
                onHide={this.closeChat}
                style={{ zIndex: "99999" }}
              >
                <Modal.Header closeButton>
                  <Modal.Title>Chat Room </Modal.Title>
                </Modal.Header>

                <Modal.Body
                  style={{
                    overflow: "auto",
                    overflowY: "auto",
                    height: "400px",
                    textAlign: "left",
                  }}
                >
                  {this.state.messages.length > 0 ? (
                    this.state.messages.map((item, index) => (
                      <div key={index} style={{ textAlign: "left" }}>
                        <p style={{ wordBreak: "break-all" }}>
                          <b>{item.sender}</b>: {item.data}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p>No message yet</p>
                  )}
                </Modal.Body>
                <Modal.Footer className='div-send-msg'>
                  <Input
                    placeholder='Message'
                    value={this.state.message}
                    onChange={e => this.handleMessage(e)}
                  />
                  <Button
                    variant='contained'
                    color='primary'
                    onClick={this.sendMessage}
                  >
                    Send
                  </Button>
                </Modal.Footer>
              </Modal>
            </div>

            {/* <div
              style={{
                justifyContent: "center",
                textAlign: "center",
                paddingTop: "40px",
              }}
            >
              <video
                id='my-video'
                ref={this.localVideoref}
                autoPlay
                muted
                style={{
                  borderStyle: "solid",
                  borderColor: "#bdbdbd",
                  objectFit: "fill",
                  width: "60%",
                  height: "30%",
                }}
              ></video>
              <IconButton
                style={{ color: "#424242" }}
                onClick={this.handleVideo}
              >
                {this.state.video === true ? (
                  <VideocamIcon />
                ) : (
                  <VideocamOffIcon />
                )}
              </IconButton>

              <IconButton
                style={{ color: "#f44336" }}
                onClick={this.handleEndCall}
              >
                <CallEndIcon />
              </IconButton>

              <IconButton
                style={{ color: "#424242" }}
                onClick={this.handleAudio}
              >
                {this.state.audio === true ? <MicIcon /> : <MicOffIcon />}
              </IconButton>
            </div>
          */}
          </div>
        ) : (
          <div className='video-page'>
            <div
              className='btn-down'
              style={{
                color: "black",
                textAlign: "center",
              }}
            >
              <IconButton
                style={{
                  color: "#ffffff",
                  backgroundColor: "#808080",
                  margin: "5px",
                  width: "50px",
                  height: "50px",
                }}
                onClick={this.handleVideo}
              >
                {this.state.video === true ? (
                  <Tooltip title='Turn OFF your camera'>
                    <VideocamIcon />
                  </Tooltip>
                ) : (
                  <Tooltip title='Turn ON your camera'>
                    <VideocamOffIcon />
                  </Tooltip>
                )}
              </IconButton>

              <IconButton
                style={{
                  color: "#ffffff",
                  backgroundColor: "#808080",
                  margin: "5px",
                  width: "50px",
                  height: "50px",
                }}
                onClick={this.handleAudio}
              >
                {this.state.audio === true ? (
                  <Tooltip title='Turn OFF your mic'>
                    <MicIcon />
                  </Tooltip>
                ) : (
                  <Tooltip title='Turn ON your mic'>
                    <MicOffIcon />
                  </Tooltip>
                )}
              </IconButton>
              <IconButton
                style={{
                  color: "#ffffff",
                  backgroundColor: "#808080",
                  margin: "5px",
                  width: "50px",
                  height: "50px",
                }}
                onClick={this.handleRecord}
              >
                {this.state.record === false ? (
                  <Tooltip title='Record Video'>
                    <MovieFilterIcon />
                  </Tooltip>
                ) : (
                  <Tooltip title='Download Video'>
                    <GetAppIcon />
                  </Tooltip>
                )}
              </IconButton>
              {/* <IconButton
                style={{
                  color: "#ffffff",
                  backgroundColor: "#808080",
                  margin: "5px",
                  width: "50px",
                  height: "50px",
                }}
                onClick={this.download}
              >
                <GetAppIcon />
              </IconButton> */}
              <IconButton
                style={{
                  color: "#ffffff",
                  backgroundColor: "red",
                  margin: "5px",
                  width: "50px",
                  height: "50px",
                }}
                onClick={this.handleEndCall}
              >
                <Tooltip title='Leave the Call'>
                  <CallEndIcon />
                </Tooltip>
              </IconButton>
              {this.state.screenAvailable === true ? (
                <IconButton
                  style={{
                    color: "#ffffff",
                    backgroundColor: "#808080",
                    margin: "5px",
                    width: "50px",
                    height: "50px",
                  }}
                  onClick={this.handleScreen}
                >
                  {this.state.screen === true ? (
                    <Tooltip title='Stop sharing your screen'>
                      <ScreenShareIcon />
                    </Tooltip>
                  ) : (
                    <Tooltip title='Start sharing your screen'>
                      <StopScreenShareIcon />
                    </Tooltip>
                  )}
                </IconButton>
              ) : null}
              <IconButton
                style={{
                  color: "#ffffff",
                  backgroundColor: "#808080",
                  margin: "5px",
                  width: "50px",
                  height: "50px",
                }}
                onClick={this.handRaise}
              >
                <Tooltip title='Raise your Hand'>
                  <PanToolIcon />
                </Tooltip>
              </IconButton>
              <Badge
                badgeContent={this.state.newmessages}
                max={999}
                color='secondary'
                onClick={this.openChat}
              >
                <IconButton
                  style={{
                    color: "#ffffff",
                    backgroundColor: "#808080",
                    margin: "5px",
                    width: "50px",
                    height: "50px",
                  }}
                  onClick={this.openChat}
                >
                  <Tooltip title='Chat with Others'>
                    <ChatIcon />
                  </Tooltip>
                </IconButton>
              </Badge>
              {/* <p>Filters!</p>
              <select
                value={this.state.value}
                onChange={this.changeFilter}
                className='dropdown-cust'
              >
                <option value='none'>None</option>
                <option value='grayscale(100%)'>Grayscale</option>
                <option value='sepia(100%)'>Sepia</option>
                <option value='brightness(200%)'>Brightness</option>
                <option value='hue-rotate(90deg)'>Hue </option>
                <option value='invert(75%)'>Invert</option>
                <option value='saturate(30%)'>Saturate</option>
              </select> */}
            </div>

            <Modal
              show={this.state.showModal}
              onHide={this.closeChat}
              style={{ zIndex: "99999" }}
            >
              <Modal.Header closeButton>
                <Modal.Title>Chat Room </Modal.Title>
              </Modal.Header>

              <Modal.Body
                style={{
                  overflow: "auto",
                  overflowY: "auto",
                  height: "400px",
                  textAlign: "left",
                }}
              >
                {this.state.messages.length > 0 ? (
                  this.state.messages.map((item, index) => (
                    <div key={index} style={{ textAlign: "left" }}>
                      <p style={{ wordBreak: "break-all" }}>
                        <b>{item.sender}</b>: {item.data}
                      </p>
                    </div>
                  ))
                ) : (
                  <p>No message yet</p>
                )}
              </Modal.Body>
              <Modal.Footer className='div-send-msg'>
                <Input
                  placeholder='Message'
                  value={this.state.message}
                  onChange={e => this.handleMessage(e)}
                />
                <Button
                  variant='contained'
                  color='primary'
                  onClick={this.sendMessage}
                >
                  Send
                </Button>
              </Modal.Footer>
            </Modal>

            <div className='container'>
              <div style={{ paddingTop: "20px" }}>
                <Input value={window.location.href} disable='true'></Input>
                <Button
                  style={{
                    backgroundColor: "#3f51b5",
                    color: "whitesmoke",
                    marginLeft: "20px",
                    marginTop: "10px",
                    width: "120px",
                    fontSize: "10px",
                  }}
                  onClick={this.copyUrl}
                >
                  Copy invite link
                </Button>
                <p>Filters</p>
                <select
                  style={{
                    backgroundColor: "#3f51b5",
                    color: "whitesmoke",
                    margin: "auto",

                    borderRadius: "10%",
                  }}
                  value={this.state.value}
                  onChange={this.changeFilter}
                  className='dropdown-cust'
                >
                  <option value='none'>None</option>
                  <option value='grayscale(100%)'>Grayscale</option>
                  <option value='sepia(100%)'>Sepia</option>
                  <option value='brightness(200%)'>Brightness</option>
                  <option value='hue-rotate(90deg)'>Hue </option>
                  <option value='invert(75%)'>Invert</option>
                  <option value='saturate(30%)'>Saturate</option>
                </select>
              </div>

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
                    width: "50%",
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
