/**
 * Component: Dice
 * Description: Dice configurable in amount of dice and number of faces
 */
module.exports = {
    roll: ({ quantity = 1, faces = 6} = {}) => Array(quantity).fill().map(() => Math.floor(Math.random() * faces) + 1)
};
