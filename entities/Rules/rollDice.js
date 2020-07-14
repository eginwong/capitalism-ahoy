/**
 * Rule: Player Rolls Dice
 * Effect: Dice Result saved to Turn
 */
// const turn = require('../Components/Turn'); // Interface ?
const dice = require('../Components/Dice');
module.exports = function rollDice ({ notify }, { turnValues }) {
    // TODO: UI.prompt -> UI.anyKey
    let roll = dice.roll({ quantity: 2 });

    // TODO: LastRoll instead ?
    Object.assign(turnValues, {
        roll
    });

    notify("DICE_ROLLED");
};
