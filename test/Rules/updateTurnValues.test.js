const expect = require("chai").expect;
const { GameState } = require("../../entities/GameState");
const updateTurnValuesFactory = require("../../entities/Rules/updateTurnValues");

describe("updateTurnValues", () => {
  it("returns a function", () => {
    expect(typeof updateTurnValuesFactory({})).to.equal(
      "function",
      "updateTurnValues is not returning a factory"
    );
  });

  it("updates gameState turnValues with input parameters", () => {
    const turnValTemplate = {
      roll: [1, 2],
    };
    const rollUpdater = updateTurnValuesFactory(turnValTemplate);
    const gameState = new GameState();
    gameState.turnValues = { speedingCounter: 0 };
    rollUpdater(gameState);
    expect(gameState.turnValues).to.deep.equal({
      roll: [1, 2],
      speedingCounter: 0,
    }, "updateTurnValues is not merging previous turn values");
  });
});
