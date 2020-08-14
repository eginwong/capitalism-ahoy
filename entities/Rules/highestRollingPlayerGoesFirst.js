// TODO: TEST
/**
 * Rule: Highest Rolling Player Goes First
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
  let { hIndex: highest } = rolls.reduce(
    ({ hValue = 0, hIndex = 0 }, roll, index) =>
      roll > hValue ? { hValue: roll, hIndex: index } : { hValue, hIndex },
    {}
  );
  // TODO: Handle Ties
  let shiftValue = (players.length - highest) % players.length;
  for (; shiftValue > 0; --shiftValue) players.push(players.shift());

  // add ids to players
  for (let id = 0; id < players.length; id++) players[id].id = id;
};
