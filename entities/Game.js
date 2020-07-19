/**
 * Responsibility: 
 *   Constructs the game from the input parameters.
 *   As a result, we can load in a saved file as the {gameState}.
 *
 * For example: node.js uses `EventEmitter` and browser uses `window` for the {eventBus},
 *   so we can continue games between different platforms.
*/
const { forIn } = require('lodash');
module.exports = function _capitalismAhoyGame({ eventBus, userInterface, gameState }) {
    const Rules = require("./Rules");
    /// Helpers
    let { on, emit: notify } = eventBus;
    on = on.bind(eventBus);
    notify = notify.bind(eventBus);

    // Wrapper for subscribing one-to-many functions to an event
    const when = (eventName, ...handlers) => {
        handlers.forEach(handler =>
            on(eventName, handler.bind(null, { notify, UI: userInterface }, gameState))
        );
    };

    // Wire all the game rules
    forIn(Rules, (rules, condition) =>
        when(condition, ...rules)
    );

    // Start the game
    notify("START_GAME");
};
