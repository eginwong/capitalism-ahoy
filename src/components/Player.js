import React, { Component } from "react";
import './Player.css';

class Player extends Component {
  constructor(props) {
    super(props);
    this.state = {
      name: props.name,
      position: 0,
      jail: false,
      token: "/resources/tokens/" + props.token + ".png",
      cash: 1500,
      properties: []
    };
  }

  render() {
    return (
      <div>
          <h2>{this.state.name}</h2>
          <div className="player__avatar">
              <img src={process.env.PUBLIC_URL + this.state.token} alt="player token"></img>
          </div>
          <div>
              With all o' that ${this.state.cash} monies.
          </div>
      </div>
    );
  }
}

export default Player;
