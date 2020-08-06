/**
 * Responsibility:
 *   Defines state of a game world.
 */
class GameState {
  turn = 0;
  players = [];
  config;

  get currentPlayer() {
    return this.players[this.turn % this.players.length];
  }
}

module.exports = { GameState };
