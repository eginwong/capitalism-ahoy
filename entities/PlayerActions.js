/**
 * Responsibility:
 *   Player-driven actions that can be executed depending on certain game conditions.
 */
const { transform } = require('lodash');
const { getProperties } = require('./PropertyManagementService');

const ACTIONS = {
  ROLL_DICE: (gameState) =>
    !gameState.turnValues.roll || gameState.turnValues.speedingCounter > 0,
  USE_GET_OUT_OF_JAIL_FREE_CARD: (gameState) =>
    gameState.currentPlayer.jailed >= 0 &&
    gameState.currentPlayer.cards.some((c) => c.action === 'getoutofjailfree'),
  PAY_FINE: (gameState) => gameState.currentPlayer.jailed >= 0,
  END_TURN: (gameState) =>
    !!gameState.turnValues.roll && gameState.turnValues.speedingCounter === 0,
  MANAGE_PROPERTIES: (gameState, player = gameState.currentPlayer) =>
    getProperties(gameState).some((p) => p.ownedBy === player.id),
  // INITIATE_TRADE
  END_GAME: () => true,
};

module.exports = class PlayerActions {
  static refresh(gameState) {
    return transform(
      ACTIONS,
      (res, isAvailable, action) => {
        if (isAvailable(gameState)) res.push(action);
      },
      []
    );
  }

  static prompt({ UI }, gameState, actions = this.refresh(gameState)) {
    UI.displayAvailableActions(actions);
    // TODO: UI.prompt -> UI.selectFrom(actions: [String], msg: String) : String | String `el` <actions>
    const answer = UI.prompt(`Which action would you like to take?\n\n`);
    return actions.find(
      (action) => action.toUpperCase() === String(answer).toUpperCase()
    );
  }

  static select({ UI }, gameState, actions = this.refresh(gameState)) {
    return UI.prompt('Which action would you like to take?', {
      type: 'select',
      choices: actions,
    });
  }

  static confirm(UI, message) {
    return UI.prompt(message, {
      type: 'confirm',
    });
  }

  static numberPrompt(UI, message) {
    return UI.prompt(message, {
      type: 'number',
    });
  }

  // returns { buyer, price }
  static auction(UI, players, property, baseCost) {
    let biddingPlayers;
    let cost = baseCost;
    let currentHighestBidPlayer;

    // require at least one player to have bid
    while (!currentHighestBidPlayer) {
      biddingPlayers = players.slice();
      // while players are still in the running
      while (biddingPlayers.length > 1) {
        UI.auctionPropertyInfo(property);
        UI.playersInAuction(biddingPlayers);
        for (let i = 0; i < biddingPlayers.length; i++) {
          UI.playerInAuction(biddingPlayers[i]);
          let bid = PlayerActions.numberPrompt(
            UI,
            `How much would you like to bid? Minimum bid is ${cost + 1} \n`
          );

          const bidParsed = parseInt(bid, 10);
          const biddingPlayer = biddingPlayers[i];
          if (
            isNaN(bidParsed) ||
            bidParsed <= cost ||
            bidParsed > biddingPlayer.liquidity
          ) {
            UI.playerOutOfAuction(biddingPlayer);
            biddingPlayer.outOfAuction = true;
          } else {
            currentHighestBidPlayer = biddingPlayer;
            cost = bidParsed;
          }
        }

        biddingPlayers = biddingPlayers.filter((p) => !p.outOfAuction);
      }
    }
    return { buyer: currentHighestBidPlayer, price: cost };
  }
};
