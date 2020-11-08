module.exports = class AuctionSevice {
  static auction(UI, players, property, baseCost) {
    let biddingPlayers;
    let cost = baseCost;
    let currentHighestBidPlayer;

    // require at least one player to have bid
    while (!currentHighestBidPlayer) {
      biddingPlayers = players.slice();
      // while players are still in the running
      while (biddingPlayers.length > 1) {
        UI.displayPropertyDetails(property);
        UI.playersInAuction(biddingPlayers);
        for (let i = 0; i < biddingPlayers.length; i++) {
          UI.playerInAuction(biddingPlayers[i]);
          let bid = UI.promptNumber(
            `How much would you like to bid? Minimum bid is ${cost + 1} \n`
          );

          const biddingPlayer = biddingPlayers[i];
          if (isNaN(bid) || bid <= cost || bid > biddingPlayer.liquidity) {
            UI.playerOutOfAuction(biddingPlayer);
            biddingPlayer.outOfAuction = true;
          } else {
            currentHighestBidPlayer = biddingPlayer;
            cost = bid;
          }
        }

        biddingPlayers = biddingPlayers.filter((p) => !p.outOfAuction);
      }
    }
    return { buyer: currentHighestBidPlayer, price: cost };
  }
};
