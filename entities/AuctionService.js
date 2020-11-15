module.exports = class AuctionService {
  static auction(UI, players, property, baseCost) {
    let bids = Array(players.length).fill(0);
    let cost = baseCost;
    let biddingPlayer = null; // Hoisted variable used in loop

    // While the count of players bidding is not one..
    while (bids.filter((bid) => bid > 0).length !== 1) {
      UI.displayPropertyDetails(property);
      UI.playersInAuction(
        // If NOT (-1) THEN bidding player ELSE false
        bids
          .map((bid, index) => (~bid ? players[index] : false))
          .filter((player) => player) // players only
      );

      bids = bids.map((bid, index) => {
        if (!~bid) return -1; // Player is out of auction
        if (bid === cost) return bid; // Player is already highest bidder
        biddingPlayer = players[index];
        UI.playerInAuction(biddingPlayer);
        bid = UI.promptNumber(
          `How much would you like to bid? Minimum bid is $${cost + 1}\n`
        );

        if (isNaN(bid) || bid <= cost || bid > biddingPlayer.liquidity) {
          UI.playerOutOfAuction(biddingPlayer);
          return -1; // Player is out of auction
        }

        return (cost = bid);
      });

      // requires at least one player to have bid
      // If no bidders.. (GOTO or recursive call)
      if (bids.filter((bid) => bid > 0).length === 0) {
        // Start over
        bids = Array(players.length).fill(0);
        cost = baseCost;
      }
    }

    return { buyer: players[bids.findIndex((bid) => ~bid)], price: cost };
  }
};
