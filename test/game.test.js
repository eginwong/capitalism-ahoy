const expect = require("chai").expect;
const { GameState } = require("./../GameState");

describe("GameState", () => {
  describe("scaffolding", () => {
    let gameState;
    beforeEach(() => {
      gameState = new GameState();
    });
    it("should load default values into GameState", () => {
      expect(gameState.turn).equal(0);
    });
  });

  function createPlayer({ name }) {
    return {
      name,
      position: 0,
      jailed: -1,
      cash: 1500,
      netWorth: 1500,
      getOutOfJailFreeCards: 0,
      properties: [],
    };
  }
});
