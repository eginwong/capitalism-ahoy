module.exports = {
  createPlayerFactory: function () {
    let id = -1;
    function createPlayer({ name }) {
      return {
        name,
        id: ++id,
        position: 0,
        jailed: -1,
        cash: 1500,
        assets: 0,
        getOutOfJailFreeCards: 0,
        properties: [],
      };
    }

    return createPlayer;
  },

  fillStub: function (stub, stubValues) {
    for (let [index, value] of stubValues.entries()) {
      stub.onCall(index).returns(value);
    }
    return stub;
  },
};
