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
  PLAYER_INFO: () => true,
  TRADE: () => true,
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

  static prompt({ UI }, message) {
    // TODO: UI.prompt -> UI.selectFrom(actions: [String], msg: String) : String | String `el` <actions>
    UI.prompt(message);
  }

  static select(UI, actions, options = {}) {
    if (actions.length === 0) {
      return 'CANCEL';
    }

    // for each action that is only a string, transform into object with name/value
    // that also takes out underscores
    const objectifiedActions = actions.map(
      // need to put value first, or else it will be modified by the replace
      (a, index) =>
        typeof a === 'string'
          ? { display: a.replace('_', ' '), value: actions[index] }
          : a
    );

    let index = UI.promptSelect(
      objectifiedActions.map((a) => a.display),
      'Which action would you like to take?',
      options
    );
    // if player selects 'Cancel' from the prompt, an index of -1 is returned
    return index > -1 ? objectifiedActions[index].value : 'CANCEL';
  }

  static selectProperties(UI, properties) {
    // transforms properties into selection targets
    return PlayerActions.select(
      UI,
      properties.map((p) => ({
        display: UI.mapPropertyShortDisplay(p),
        value: p,
      }))
    );
  }

  static confirm(UI, message) {
    return UI.promptConfirm(message);
  }

  static numberPrompt(UI, message) {
    return UI.promptNumber(message);
  }

  // returns { buyer, price }
  static auction(UI, players, property, baseCost) {
    return require('./AuctionService').auction(UI, players, property, baseCost);
  }

  // returns { player, details: { assetsFrom: [], assetsTo: [] }}
  static trade(UI, gameState) {
    return require('./TradeService').trade(UI, gameState);
  }
};
