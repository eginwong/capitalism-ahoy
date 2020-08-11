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
};
