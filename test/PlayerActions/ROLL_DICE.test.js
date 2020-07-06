const expect = require("chai").expect;
const EventEmitter = require("events");
const sinon = require("sinon");

const mockUIFactory = require('../mocks/UI');

const { GameState } = require("../../entities/GameState");
const { createPlayer, setupMockDice } = require("../testutils");

describe("PlayerActions -> ROLL_DICE", () => {
  let gameState;
  let mockUI;
  let eventBusEmitter;
  let PLAYER_ACTIONS;
  
  beforeEach(() => {
    gameState = new GameState();
    eventBusEmitter = new EventEmitter();
    mockUI = mockUIFactory();
    
    gameState.players = [createPlayer({ name: "player1" })];
    PLAYER_ACTIONS = require("../../entities/PlayerActions")(eventBusEmitter, mockUI, gameState);
  });
  
  afterEach(() => {
    // Restore the default sandbox here
    sinon.restore();
  });
  
  describe("rollDice", () => {
    // The method under test
    let methodUnderTest;
    // Output Event from "rollDice"'s emit
    const outputEvent = "DICE_ROLLED";
    let outputSpy;
    
    beforeEach(() => {
      outputSpy = sinon.spy();
      // Clear default listeners to prevent side-effects*
      eventBusEmitter.removeAllListeners(outputEvent)
      eventBusEmitter.on(outputEvent, outputSpy);
      
      methodUnderTest = PLAYER_ACTIONS.ROLL_DICE.execute;
    });
    
    it(`should emit ${ outputEvent } event with an Array of two Numbers`, () => {
      methodUnderTest();
      expect(outputSpy.callCount).to.equal(1, `${ outputEvent } was not called`);
      // Args :: [Params] ; we destructure to get the first parameter (here, the only parameter)
      const [output] = outputSpy.firstCall.args;
      expect(Array.isArray(output)).to.equal(true, "rollDice did not output an Array");
      expect(output.every(n => typeof n === 'number')).to.equal(true, "rollDice output Array is not only Numbers");
    });
    
    it(`should make a call to the UI#rollingDice`, () => {
      const uiSpy = sinon.spy(mockUI, "rollingDice");
      methodUnderTest();
      
      expect(uiSpy.callCount).to.equal(1);
    });
  });

  describe("isAvailable", () => {
    let methodUnderTest;
    let mockRolls;

    beforeEach(() => {
      methodUnderTest = PLAYER_ACTIONS.ROLL_DICE.isAvailable.bind(null, undefined, gameState);

      mockRolls = function (arrayOfRolls) {
        sinon.stub(PLAYER_ACTIONS.ROLL_DICE, "execute").callsFake(setupMockDice(
          arrayOfRolls,
          eventBusEmitter
        ));
      };
    });

    it("should be available before first roll of the dice", () => {
      let result = methodUnderTest();
      expect(result).to.equal(true, "Action was not available before first dice roll");

      mockRolls([
        [1, 3],
      ]);
      PLAYER_ACTIONS.ROLL_DICE.execute();
      result = methodUnderTest();
      expect(result).to.equal(false, "Action was available after first dice roll");
    });
    it("should be available if doubles were rolled", () => {
      mockRolls([
        [1, 1],
      ]);
      PLAYER_ACTIONS.ROLL_DICE.execute();
      let result = methodUnderTest();
      expect(result).to.equal(true, "Action was unavailable after rolling doubles");
    });
    it("shouldn't be available if player is speeding", () => {
      mockRolls([
        [1, 1],
        [2, 2],
        [3, 3],
      ]);
      PLAYER_ACTIONS.ROLL_DICE.execute();
      PLAYER_ACTIONS.ROLL_DICE.execute();
      PLAYER_ACTIONS.ROLL_DICE.execute();
      let result = methodUnderTest();
      expect(result).to.equal(false, "Action available after speeding");
    });
  });

  describe("toggleDisplay", () => {
    let methodUnderTest;

    beforeEach(() => {
      methodUnderTest = PLAYER_ACTIONS.ROLL_DICE.toggleDisplay;
    });

    it("should call the UI#rollDiceDisplay and pass a bool", () => {
      const uiSpy = sinon.spy(mockUI, "rollDiceDisplay");
      methodUnderTest(true);

      expect(uiSpy.callCount).to.equal(1, "UI method was not called");
      const [output] = uiSpy.firstCall.args;
      expect(output).to.equal(true, "UI method did not receive bool");
    });
  });
});