const expect = require("chai").expect;
const EventEmitter = require("events");
const sinon = require("sinon");

const mockUIFactory = require('../mocks/UI');

const { GameState } = require("../../entities/GameState");
const { createPlayer, setupMockDice } = require("../testutils");

describe("PlayerActions -> END_TURN", () => {
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

  describe("endTurn", () => {
    // The method under test
    let methodUnderTest;
    // Output Event from "rollDice"'s emit
    const outputEvent = "START_TURN";
    let outputSpy;

    beforeEach(() => {
      outputSpy = sinon.spy();
      eventBusEmitter.on(outputEvent, outputSpy);

      methodUnderTest = PLAYER_ACTIONS.END_TURN.execute;
    });

    it(`should emit ${ outputEvent } event`, () => {
      methodUnderTest();

      expect(outputSpy.callCount).to.equal(1, `${ outputEvent } event was not called`);
    });
    it(`should increment the turn counter`, () => {
      const before = gameState.turn;
      methodUnderTest();
      const after = gameState.turn;

      expect(after - before).to.equal(1, "Turn counter was not incremented");
    });
    it(`should make a call to the UI#endTurn`, () => {
      const uiSpy = sinon.spy(mockUI, "endTurn");
      methodUnderTest();

      expect(uiSpy.callCount).to.equal(1);
    });
  });

  describe("isAvailable", () => {
    let methodUnderTest;
    let mockRolls;

    beforeEach(() => {
      methodUnderTest = PLAYER_ACTIONS.END_TURN.isAvailable.bind(null, undefined, gameState);

      mockRolls = function (arrayOfRolls) {
        sinon.stub(PLAYER_ACTIONS.ROLL_DICE, "execute").callsFake(setupMockDice(
          arrayOfRolls,
          eventBusEmitter
        ));
      };
    });

    it("should be available after rolling dice", () => {
        let result = methodUnderTest();
        expect(result).to.equal(false, "Available before rolling dice");

        mockRolls([
            [1, 3],
        ]);
        PLAYER_ACTIONS.ROLL_DICE.execute();
        gameState.turnTaken = true;

        result = methodUnderTest();
        expect(result).to.equal(true, "Unavailable after rolling dice");
    });

    it("should be unavailable on doubles", () => {
        mockRolls([
            [1, 1],
            [2, 2],
            [3, 4]
        ]);
        PLAYER_ACTIONS.ROLL_DICE.execute();
        gameState.turnTaken = true;
        gameState.speedingCounter++;
        
        let result = methodUnderTest();
        expect(result).to.equal(false, "Available on doubles");
        
        PLAYER_ACTIONS.ROLL_DICE.execute();
        gameState.speedingCounter++;
        PLAYER_ACTIONS.ROLL_DICE.execute();
        gameState.speedingCounter = 0;
        
        result = methodUnderTest();
        expect(result).to.equal(true, "Unavailable on non-doubles roll after rolling doubles");
    });
  });

  describe("toggleDisplay", () => {
    let methodUnderTest;

    beforeEach(() => {
      methodUnderTest = PLAYER_ACTIONS.END_TURN.toggleDisplay;
    });

    it("should call the UI#endTurnDisplay and pass a bool", () => {
      const uiSpy = sinon.spy(mockUI, "endTurnDisplay");
      methodUnderTest(true);

      expect(uiSpy.callCount).to.equal(1, "UI method was not called");
      const [output] = uiSpy.firstCall.args;
      expect(output).to.equal(true, "UI method did not receive bool");
    });
  });
});