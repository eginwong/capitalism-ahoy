/**
 * Rule: Highest Rolling Player Goes First
 *   Based on the highest rolling player and then beginning clockwise from there to set the
 *   player order.
 * Effect: Reorder PlayerList Component based on Contest with Dice Component
 */
module.exports = function highestRollingPlayerGoesFirst({ UI }, { players }) {
  // TODO: UI.prompt -> UI.anyKey
  let rolls = players.map(({ name }) => {
    UI.prompt(`${name} roll dice - `);
    let roll = require('../Components/Dice').roll()[0];
    console.log(`\t\t   `, roll);
    return roll;
  });
  let { hIndex: shiftValue } = rolls.reduce(
    ({ hValue = 0, hIndex = 0 }, roll, index) =>
      roll > hValue ? { hValue: roll, hIndex: index } : { hValue, hIndex },
    {}
  );

  // TODO: Handle Ties
  for (; shiftValue > 0; --shiftValue) players.push(players.shift());
};
