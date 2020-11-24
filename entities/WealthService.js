module.exports = class WealthService {
  static increment(player, amount) {
    player.cash += amount;
  }

  static decrement(player, amount) {
    player.cash -= amount;
  }

  /**
   * Reminder that a net worth check should be performed before calling this function
   * @param {*} player
   * @param {*} assetPrice
   */
  static buyAsset(player, assetPrice, assetValue = assetPrice) {
    WealthService.decrement(player, assetPrice);
    player.assets += assetValue;
  }

  /**
   * This function is only to be called when selling of a house or hotel or mortgaging
   * @param {*} player
   * @param {*} buildingPrice, either house or hotel but same buildingCost
   */
  static sellAsset(player, buildingPrice) {
    WealthService.increment(player, buildingPrice);
    player.assets -= buildingPrice;
  }

  /**
   * Exchange of cash between two players (i.e., rent)
   * @param {*} sourcePlayer player who is paying money
   * @param {*} targetPlayer player who is gaining money
   * @param {*} amount
   */
  static exchange(sourcePlayer, targetPlayer, amount) {
    WealthService.decrement(sourcePlayer, amount);
    WealthService.increment(targetPlayer, amount);
  }

  /**
   * Exchange of assets between two players (i.e., property on trade)
   * @param {*} sourcePlayer player who is giving away the asset
   * @param {*} targetPlayer player who is receiving the asset
   * @param {*} assetPrice
   */
  static exchangeAsset(sourcePlayer, targetPlayer, assetPrice) {
    sourcePlayer.assets -= assetPrice;
    targetPlayer.assets += assetPrice;
  }

  static calculateNetWorth(player) {
    return player.cash + player.assets;
  }

  /**
   * Determine a player's available funds
   * @param {*} gameState
   * @param {*} player
   */
  static calculateLiquidity(
    gameState,
    ownedProperties,
    player = gameState.currentPlayer
  ) {
    const totalLiquidAssets = ownedProperties
      .filter((p) => !p.mortgaged)
      .map((p) =>
        p.houseCost && p.buildings
          ? p.houseCost * p.buildings + p.price
          : p.price
      )
      .reduce((acc, val) => acc + val, 0);
    return (
      totalLiquidAssets /
        gameState.config.propertyConfig.mortgageValueMultiplier +
      player.cash
    );
  }
};
