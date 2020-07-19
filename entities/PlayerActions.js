
const { DiceService } = require("../services/DiceService");

/**
 * Responsibility: 
 *   Player-driven actions that can be executed depending on certain game conditions.
*/
const { transform } = require('lodash');

const ACTIONS = {
  ROLL_DICE: (gameState) => !gameState.turnValues.roll || (gameState.speedingCounter > 0),
  // USE_GET_OUT_OF_JAIL_CARD,
  PAY_FINE: () => true,
  END_TURN: (gameState) => !!gameState.turnValues.roll && (gameState.speedingCounter === 0),
  // MANAGE_BUILDINGS,
  // LIQUIDATE,
  // INITIATE_TRADE
};

module.exports = class PlayerActions {
  static refresh (gameState) {
    return transform(ACTIONS, (res, isAvailable, action) => {
      if (isAvailable(gameState)) res.push(action);
    }, []);
  }

  static prompt ({ UI }, gameState) {
    const actions = this.refresh(gameState);
    UI.displayAvailableActions(actions);
    
    // TODO: UI.prompt -> UI.selectFrom(actions: [String], msg: String) : String | String `el` <actions>
    const answer = UI.prompt(
        `Which action would you like to take?\n\n`
    );
    return actions.find(
        action => action === String(answer).toUpperCase()
    );
  }
}

// module.exports = function (eventBus, userInterface, gameState) {
//   return {
//     ROLL_DICE: {
//       execute: rollDice,
//       isAvailable: (_, gameState) =>
//         !gameState.turnTaken || (gameState.speedingCounter > 0),
//       toggleDisplay: (shouldDisplay) => userInterface.rollDiceDisplay(shouldDisplay),
//     },
//     // USE_GET_OUT_OF_JAIL_CARD,
//     PAY_FINE: {
//       execute: payFine,
//       isAvailable: () => true,
//       toggleDisplay: (shouldDisplay) => userInterface.payFineDisplay(shouldDisplay),
//       // not available if your networth < FINE
//     },
//     END_TURN: {
//       execute: endTurn,
//       // FUTURE: think about bankrupt or jail
//       isAvailable: (_, gameState) =>
//         gameState.turnTaken && (gameState.speedingCounter === 0),
//       toggleDisplay: (shouldDisplay) => userInterface.endTurnDisplay(shouldDisplay),
//     },
//     // MANAGE_BUILDINGS,
//     // LIQUIDATE,
//     // INITIATE_TRADE
//   };

//   // ======================================FUNCTIONS======================================

  // function endTurn() {
  //   userInterface.endTurn();
  //   // UI: fancy game animation
  //   delete gameState.lastRoll;
  //   gameState.turn++;
  //   // begin next turn
  //   eventBus.emit("START_TURN");
  // }
//   function payFine() {
//     userInterface.payFine();
//     const FINE = 50;
//     gameState.currentPlayer.cash -= FINE;
//     // TODO: investigate using setter for bankruptcy logic

//     // REVISIT: NETWORTH
//     // if (gameState.currentPlayer.cash < 0 && gameState.currentPlayer.netWorth < Math.abs(gameState.currentPlayer.cash)) {
//     if (
//       gameState.currentPlayer.netWorth < Math.abs(gameState.currentPlayer.cash)
//     ) {
//       eventBus.emit("BANKRUPTCY");
//     } else if (gameState.currentPlayer.cash < 0) {
//       // UI: show liquidation menu
//       // TODO: KENTINUE
//       eventBus.emit("LIQUIDATION");
//     }
//     gameState.currentPlayer.jailed = -1;

//     // UI: disable action
//   }

//   function rollDice() {
//     userInterface.rollingDice();
//     eventBus.emit("DICE_ROLLED", DiceService.roll({diceQuantity: 2}));
//   }
// };
