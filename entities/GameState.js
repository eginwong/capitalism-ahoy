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
      return this.players.find(
        (p) => p.id === this.turnValues.subTurn.playerId
      );
    }
    return this.players[this.turn % this.players.length];
  }
}

module.exports = { GameState };
