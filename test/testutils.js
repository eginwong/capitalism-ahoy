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
  setupMockDice: function (rolls, eventBus) {
    const diceGenerator = function* _diceGenerator() {
      for (rollCombo of rolls) {
        let roll1 = rollCombo[0];
        let roll2 = rollCombo[1];
        if (roll1 > 6 || roll1 < 1 || roll2 > 6 || roll2 < 1) {
          throw Error("bad input to mock roll dice function");
        }
        yield [roll1, roll2];
      }
    }();

    return () => eventBus.emit("DICE_ROLLED", diceGenerator.next().value);
  },
};
