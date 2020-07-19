/**
 * Rule: A set of state values associated with a "Turn" reset on a "new Turn"
 * Effect: Turn-associated values are reset
 */
// const turn = require('../Components/Turn'); // Interface ?
module.exports = function _resetTurnAssociatedValues (template) {
    return function resetTurnAssociatedValues (gameState) {
        Object.assign(gameState, {
            turnValues: template
        });
    }
};
