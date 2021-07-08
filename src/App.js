import React, { Component } from "react"
import Video from "./Video/Video"
import Home from "./Home/Home"
import Message from "./Message"
import ChatBot from "./ChatBot"
import { BrowserRouter as Router, Switch, Route } from "react-router-dom"

class App extends Component {
  render() {
    return (
      <div>
        <ChatBot />
        <Router>
          <Switch>
            <Route path='/' exact component={Home} />
            <Route path='/:url' component={Video} />
            <Route path='/:url/message' component={Message} />
          </Switch>
        </Router>
      </div>
    )
  }
}

export default App
