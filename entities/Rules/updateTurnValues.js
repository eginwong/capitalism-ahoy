/**
 * Rule: Turn values are updated during Turn
 * Effect: Turn value mutated
 */
// const turn = require('../Components/Turn'); // Interface ?
module.exports = function _updateTurnValues (template) {
    return function updateTurnValues ({ notify }, gameState) {
        Object.assign(gameState, {
            turnValues: template
        });
        notify("TURN_VALUES_UPDATED");
    }
};
