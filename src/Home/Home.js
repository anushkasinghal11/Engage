import React, { Component } from "react"
import { Input, Button } from "@material-ui/core"
import "./Home.css"

class Home extends Component {
  constructor(props) {
    super(props)
    this.state = {
      url: "",
    }
  }

  handleChange = e => this.setState({ url: e.target.value })
  create = () => {
    var url = Math.random().toString(36).substring(2, 7)
    window.location.href = `/${url}`
  }
  join = () => {
    if (this.state.url !== "") {
      var url = this.state.url.split("/")
      window.location.href = `/${url[url.length - 1]}`
    } else {
      window.alert("Please enter the URL of the room you wish to enter")
    }
  }

  render() {
    return (
      <div className='container2'>
        <div>
          <h1 style={{ fontSize: "45px" }}>Teams Mini</h1>
          <p style={{ fontWeight: "200" }}>
            Video Chat Website to connect with your friends.
          </p>
        </div>

        <div>
          <p style={{ margin: 0, fontWeight: "bold", paddingRight: "50px" }}>
            Start or join a meeting
          </p>
          <Button
            variant='contained'
            color='purple'
            onClick={this.create}
            style={{ margin: "20px" }}
          >
            Start
          </Button>
          <Input placeholder='URL' onChange={e => this.handleChange(e)} />
          <Button
            variant='contained'
            color='purple'
            onClick={this.join}
            style={{ margin: "20px" }}
          >
            Join
          </Button>
        </div>
      </div>
    )
  }
}

export default Home
