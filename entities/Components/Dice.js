/**
 * Component: Dice
 * Description: Dice configurable in amount of dice and number of faces
 */
module.exports = {
    /**
     * Rolls dice based on parameters passed
     * @param { Object } [options = {}] The options passed to the function
     * @param { number } [options.quantity = 1] The number of dice to roll
     * @param { number } [options.faces = 6] The number of faces on a die used
     * @return { number[] } An array of the resultant rolls
     */
    roll: ({ quantity = 1, faces = 6} = {}) => Array(quantity).fill().map(() => Math.floor(Math.random() * faces) + 1)
};
