module.exports = {
  createPlayerFactory: () => {
    let id = -1;
    function createPlayer({ name }) {
      return {
        name,
        id: ++id,
        position: 0,
        jailed: -1,
        cash: 1500,
        assets: 0,
        cards: [],
        bankrupt: false,
      };
    }

    return createPlayer;
  },

  fillStub: (stub, stubValues) => {
    for (let [index, value] of stubValues.entries()) {
      stub.onCall(index).returns(value);
    }
    return stub;
  },

  createMonopoly: (
    gameState,
    propertyGroup,
    playerId = gameState.currentPlayer.id
  ) => {
    gameState.config.propertyConfig.properties
      .filter((p) => p.group === propertyGroup)
      .forEach((p) => {
        p.ownedBy = playerId;
      });
  },

  getCommunityChestCard: (gameState, action) => {
    return gameState.config.communityChestConfig.availableCards.find(
      (c) => c.action === action
    );
  },

  getChanceCard: (gameState, action) => {
    return gameState.config.chanceConfig.availableCards.find(
      (c) => c.action === action
    );
  },
};
