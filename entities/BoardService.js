const PropertyManagementService = require('./PropertyManagementService');

module.exports = class BoardSevice {
  static normalizePlayerBoardPosition(gameState) {
    return (
      gameState.currentPlayer.position %
      PropertyManagementService.getProperties(gameState).length
    );
  }

  static nearestPropertyByGroupToPlayer(gameState, propertyGroup) {
    const propertiesInGroup = PropertyManagementService.getPropertiesInPropertyGroup(
      gameState,
      propertyGroup
    );
    const playerPosition = gameState.currentPlayer.position;
    const propertyBeforeBoardEnds = propertiesInGroup.find(
      (prop) => playerPosition < prop.position
    );
    // if none before, take the first property
    return propertyBeforeBoardEnds || propertiesInGroup[0];
  }

  // always current player
  static retrievePositionToPropertyWithoutNormalization(gameState, property) {
    const playerPosition = gameState.currentPlayer.position;
    return playerPosition > property.position
      ? property.position +
          PropertyManagementService.getProperties(gameState).length
      : property.position;
  }
};
