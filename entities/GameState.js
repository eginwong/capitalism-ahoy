
const { cloneDeep } = require("lodash");

/**
 * Responsibility: 
 *   Defines state of a game world.
*/
class GameState {
  turn = 0;
  turnTaken = false;
  players = [];
  _allPlayerActions = {};
  currentPlayerActions = {};
  debug = false;

  get currentPlayer() {
    return this.players[this.turn % this.players.length];
  }

  // global list of actions
  get allPlayerActions() {
    return cloneDeep(this._allPlayerActions);
  }

  set allPlayerActions(actions) {
    this._allPlayerActions = actions;
  }

  // current-player stateful actions
  get currentPlayerActions() {
    return this.currentPlayerActions;
  }

  set currentPlayerActions(actions) {
    this.currentPlayerActions = actions;
  }
}

module.exports = { GameState };
