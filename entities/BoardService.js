const { getProperties } = require('./PropertyManagementService');

module.exports = class BoardSevice {
  static normalizePlayerBoardPosition(gameState) {
    return gameState.currentPlayer.position % getProperties(gameState).length;
  }
};
