module.exports = {
  createPlayer: function ({ name }) {
    return {
      name,
      id: 0,
      position: 0,
      jailed: -1,
      cash: 1500,
      assets: 0,
      getOutOfJailFreeCards: 0,
      properties: [],
    };
  },

  fillStub: function (stub, stubValues) {
    for (let [index, value] of stubValues.entries()) {
      stub.onCall(index).returns(value);
    }
    return stub;
  },
};
