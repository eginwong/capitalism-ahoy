const expect = require("chai").expect;
const { GameState } = require("../../entities/GameState");
const resetTurnAssociatedValuesFactory = require("../../entities/Rules/resetTurnAssociatedValues");

describe("resetTurnAssociatedValues", () => {
  it("returns a function", () => {
    expect(typeof resetTurnAssociatedValuesFactory({})).to.equal(
      "function",
      "resetTurnAssociatedValues is not returning a factory"
    );
  });

  it("reset gameState turnValues with input parameters", () => {
    const turnValTemplate = {
      speedingCounter: 0,
    };
    const resetTurnValues = resetTurnAssociatedValuesFactory(turnValTemplate);
    const gameState = new GameState();
    gameState.turnValues = {
      roll: [1, 2],
      speedingCounter: 0,
    };
    resetTurnValues(gameState);
    expect(gameState.turnValues).to.deep.equal(
      turnValTemplate,
      "resetTurnValues is not resetting previous turnValues state"
    );
  });
});
