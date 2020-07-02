const expect = require("chai").expect;
const EventEmitter = require("events");
const sinon = require("sinon");
const { GameState } = require("../entities/GameState");

describe("Game", () => {
  let gameState;
  let mockUI;

  beforeEach(() => {
    gameState = new GameState();
    mockUI = {
      startGame: () => true,
      startTurn: (player) => false,
      displayAvailableActions: (actions) => false,
      prompt: () => true,
      endTurn: () => true,
      rollingDice: () => true,
      rollDiceDisplay: (shouldDisplay) => true,
      payFineDisplay: (shouldDisplay) => true,
      endTurnDisplay: (shouldDisplay) => true,
      diceRollResults: (roll1, roll2) => true,
      rollNormalDice: () => true,
      rollJailDice: () => true,
      caughtSpeeding: () => true,
      playerMovement: (position) => true,
      payFine: () => true,
      passGo: () => true,
      jail: () => true,
    };
  });
  afterEach(() => {
    // Restore the default sandbox here
    sinon.restore();
  });
  describe("constructor", () => {
    it("constructor should return object with events and player actions", () => {
      const eventBusEmitter = new EventEmitter();
      const gameObj = require("../entities/Game")(
        eventBusEmitter,
        mockUI,
        gameState
      );
      expect(Object.keys(gameObj.EVENTS)).to.deep.equal([
        "START_GAME",
        "START_TURN",
        "CONTINUE_TURN",
        "DICE_ROLLED",
        "MOVE_PLAYER",
        "PASS_GO",
        "SPEEDING",
        "JAIL"
      ]);
      expect(Object.keys(gameObj.PLAYER_ACTIONS)).to.deep.equal([
        "ROLL_DICE",
        "PAY_FINE",
        "END_TURN",
      ]);
    });
    it("constructor should populate all player actions on gamestate and event listeners on emitter", () => {
      const eventBusEmitter = new EventEmitter();
      require("../entities/Game")(eventBusEmitter, mockUI, gameState);
      expect(Object.keys(gameState.allPlayerActions)).to.deep.equal([
        "ROLL_DICE",
        "PAY_FINE",
        "END_TURN",
      ]);
      expect(eventBusEmitter.eventNames()).to.deep.equal([
        "START_GAME",
        "START_TURN",
        "CONTINUE_TURN",
        "DICE_ROLLED",
        "MOVE_PLAYER",
        "PASS_GO",
        "SPEEDING",
        "JAIL"
      ]);
    });
  });
});
