import React from "react";

import Player from "./Player";

function PlayerList() {
    return (
        <React.Fragment>
            <Player name="Scottie" token="car"/>
            <Player name="Keegs" token="boat"/>
            <Player name="Pippen" token="space-invader"/>
        </React.Fragment>
    );
  }

export default PlayerList;