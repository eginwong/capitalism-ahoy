import React from "react";
import "./PlayerList.css";

import Player from "./Player";

function PlayerList() {
  return (
    <React.Fragment>
      <div className="player__list">
        <Player name="Scottie" token="car" />
        <Player name="Keegs" token="boat" />
        <Player name="Pippen" token="space-invader" />
      </div>
    </React.Fragment>
  );
}

export default PlayerList;
