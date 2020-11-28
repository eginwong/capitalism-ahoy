/**
 * Responsibility:
 *   Defines state of a game world.
 */
class GameState {
  turn = 0;
  players = [];
  currentBoardProperty = {};
  config;
  gameOver = false;

  get currentPlayer() {
    // add override for intra-turn context switches
    if (this.turnValues?.subTurn?.playerId) {
      return require('./helpers').findById(
        this.players,
        this.turnValues.subTurn.playerId
      );
    }
    return this.players[this.turn % this.players.length];
  }
}

module.exports = { GameState };
