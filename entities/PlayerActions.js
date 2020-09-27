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

    // TODO: inquirer
    // TODO: UI.prompt -> UI.selectFrom(actions: [String], msg: String) : String | String `el` <actions>
    const answer = UI.prompt(`Which action would you like to take?\n\n`);
    return actions.find(
      (action) => action.toUpperCase() === String(answer).toUpperCase()
    );
  }
};
