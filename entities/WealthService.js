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
    // TODO: do not divide by 2 any assets that are mortgaged;

    // const hasMonopoly = gameState.config.propertyConfig.properties.filter(p => p.group === boardProperty.group)
    // .every(p => p.ownedBy === player.id);
    return player.assets / 2 + player.cash;
  }
};
