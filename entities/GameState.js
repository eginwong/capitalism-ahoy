
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
  _currentPlayerActions = {};
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
    return this._currentPlayerActions;
  }

  set currentPlayerActions(actions) {
    this._currentPlayerActions = actions;
  }
}

module.exports = { GameState };
