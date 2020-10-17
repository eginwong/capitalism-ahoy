/**
 * Rule: Turn values are updated during Turn
 * Effect: Turn value mutated
 */
// const turn = require('../Components/Turn'); // Interface ?
const { merge } = require('lodash');
module.exports = function _updateTurnValues(template) {
  return function updateTurnValues(gameState) {
    merge(gameState, {
      turnValues: template,
    });
  };
};
