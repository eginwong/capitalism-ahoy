
/**
 * Responsibility: 
 *   Player-driven actions that can be executed depending on certain game conditions.
*/
module.exports = function (eventBus, userInterface, gameState) {
  return {
    ROLL_DICE: {
      execute: rollDice,
      isAvailable: (_, gameState) =>
        !gameState.turnTaken || gameState.speedingCounter > 0,
      toggleDisplay: (shouldDisplay) => userInterface.rollDiceDisplay(shouldDisplay),
    },
    // USE_GET_OUT_OF_JAIL_CARD,
    // BUY_GET_OUT_OF_JAIL_CARD,
    // SELL_GET_OUT_JAIL_CARD,
    PAY_FINE: {
      execute: payFine,
      isAvailable: () => true,
      toggleDisplay: (shouldDisplay) => userInterface.payFineDisplay(shouldDisplay),
      // not available if your networth < FINE
    },
    END_TURN: {
      execute: endTurn,
      // FUTURE: think about bankrupt or jail
      isAvailable: (_, gameState) =>
        gameState.turnTaken && gameState.speedingCounter === 0,
      toggleDisplay: (shouldDisplay) => userInterface.endTurnDisplay(shouldDisplay),
    },
    // CONSTRUCT_HOUSE,
    // DECONSTRUCT_HOUSE,
    // CONSTRUCT_HOTEL,
    // DECONSTRUCT_HOTEL,
    // MORTGAGE_PROPERTY,
    // INITIATE_TRADE
  };

  // ======================================FUNCTIONS======================================

  function endTurn() {
    userInterface.endTurn();
    // UI: fancy game animation
    gameState.turn++;
    // begin next turn
    eventBus.emit("START_TURN");
  }

  function payFine() {
    userInterface.payFine();
    const FINE = 50;
    gameState.currentPlayer.cash -= FINE;
    // TODO: investigate using setter for bankruptcy logic

    // REVISIT: NETWORTH
    // if (gameState.currentPlayer.cash < 0 && gameState.currentPlayer.netWorth < Math.abs(gameState.currentPlayer.cash)) {
    if (
      gameState.currentPlayer.netWorth < Math.abs(gameState.currentPlayer.cash)
    ) {
      eventBus.emit("BANKRUPTCY");
    } else if (gameState.currentPlayer.cash < 0) {
      // UI: show liquidation menu
      // TODO: KENTINUE
    }
    gameState.currentPlayer.jailed = -1;

    // UI: disable action
  }

  function rollDice() {
    userInterface.rollingDice();
    const roll1 = Math.floor(Math.random() * 6) + 1;
    const roll2 = Math.floor(Math.random() * 6) + 1;

    eventBus.emit("DICE_ROLLED", [roll1, roll2]);
  }
};
