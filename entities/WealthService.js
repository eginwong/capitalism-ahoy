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
  static buyAsset(player, assetPrice) {
    this.decrement(player, assetPrice);
    player.assets += assetPrice;
  }

  /**
   * Exchange of cash between two players (i.e., rent)
   * @param {*} sourcePlayer player who is paying money
   * @param {*} targetPlayer player who is gaining money
   * @param {*} amount
   */
  static exchange(sourcePlayer, targetPlayer, amount) {
    this.decrement(sourcePlayer, amount);
    this.increment(targetPlayer, amount);
  }

  static calculateNetWorth(player) {
    return player.cash + player.assets;
  }

  /**
   * Determine a player's available funds
   * @param {*} gameState
   * @param {*} player
   */
  static calculateLiquidity(gameState, player = gameState.currentPlayer) {
    const ownedProperties = gameState.config.propertyConfig.properties.filter(
      (p) => p.ownedBy === player.id
    );
    const totalLiquidAssets = ownedProperties
      .filter((p) => !p.mortgaged)
      .map((p) =>
        p.houseCost && p.buildings
          ? p.houseCost * p.buildings + p.price
          : p.price
      )
      .reduce((acc, val) => acc + val, 0);
    return totalLiquidAssets / 2 + player.cash;
  }
};
