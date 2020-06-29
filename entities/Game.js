// TODO: Consider making static?

/**
 * Responsibility: 
 *   Constructs the game from the input parameters.
 *   As a result, we can load in a saved file as the {gameState}.
 *
 * For example: node.js uses `EventEmitter` and browser uses `window` for the {eventBus},
 *   so we can continue games between different platforms.
*/
module.exports = function(eventBus, userInterface, gameState) {
  const EVENTS = require("./Events")(eventBus, userInterface, gameState);
  const PLAYER_ACTIONS = require("./PlayerActions")(eventBus, userInterface, gameState);
  
  // const REACTIONS = {
  //   BUY_PROPERTY: () => {},
  //   PAY_RENT,
  //   ENFORCE_PAY_FINE: enforcePayFine,
  //   SPEEDING: speeding,
  //   BANKRUPTCY: bankruptcy,
  //   JAIL: jail
  //   // potentially Chance/Community Cards
  // }

  // each time we create a game, set these player actions
  gameState.allPlayerActions = PLAYER_ACTIONS;

  // create loop to iterate over all events to add listeners
  Object.keys(EVENTS).forEach((e) => {
    eventBus.on(e, EVENTS[e]);
    if (gameState.debug) console.log(EVENTS[e]);
  });

  return {
    EVENTS,
    PLAYER_ACTIONS
  };
};
