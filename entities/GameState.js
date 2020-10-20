/**
 * Responsibility:
 *   Defines state of a game world.
 */
class GameState {
  turn = 0;
  players = [];
  currentBoardProperty = {};
  config;

  get currentPlayer() {
    // add override for intra-turn context switches
    if (this.turnValues?.subTurn?.player) {
      return this.turnValues.subTurn.player;
    }
    return this.players[this.turn % this.players.length];
  }
}

module.exports = { GameState };
