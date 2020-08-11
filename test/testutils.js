module.exports = {
  createPlayer: function ({ name }) {
    return {
      name,
      position: 0,
      jailed: -1,
      cash: 1500,
      assets: 0,
      getOutOfJailFreeCards: 0,
      properties: [],
    };
  },
};
