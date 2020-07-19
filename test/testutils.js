module.exports = {
  createPlayer: function ({ name }) {
    return {
      name,
      position: 0,
      jailed: -1,
      cash: 1500,
      netWorth: 1500,
      getOutOfJailFreeCards: 0,
      properties: [],
    };
  },
  // TODO: DEPRECATE
  setupMockDice: function (rolls, eventBus) {
    const diceGenerator = function* _diceGenerator() {
      for ([roll1, roll2] of rolls) {
        if (roll1 > 6 || roll1 < 1 || roll2 > 6 || roll2 < 1) {
          throw Error("bad input to mock roll dice function");
        }
        yield [roll1, roll2];
      }
    }();

    return () => eventBus.emit("DICE_ROLLED", diceGenerator.next().value);
  },
};
