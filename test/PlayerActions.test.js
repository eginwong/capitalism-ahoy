const expect = require("chai").expect;
const EventEmitter = require("events");
const sinon = require("sinon");
const { GameState } = require("../entities/GameState");
const { createPlayer } = require("./testutils");

describe("PlayerActions", () => {
  let gameState;
  let mockUI;
  let eventBusEmitter;
  let PLAYER_ACTIONS;

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
      unknownAction: () => true
    };
    eventBusEmitter = new EventEmitter();
    gameState.players = [createPlayer({ name: "player1" })];
    PLAYER_ACTIONS = require("../entities/PlayerActions")(eventBusEmitter, mockUI, gameState);
  });

  afterEach(() => {
    // Restore the default sandbox here
    sinon.restore();
  });

  describe("rollDice", () => {
    it("should emit dice rolled event", () => {
      const rollDiceSpy = sinon.spy();
      eventBusEmitter.on("DICE_ROLLED", rollDiceSpy);
      PLAYER_ACTIONS.ROLL_DICE.execute();
      expect(rollDiceSpy.callCount).to.equal(1);
      expect(typeof rollDiceSpy.args[0][0]).to.equal("object");
      expect(typeof rollDiceSpy.args[0][0][0]).to.equal("number");
      expect(typeof rollDiceSpy.args[0][0][1]).to.equal("number");
    });
    it("should make ui call", () => {
      const uiSpy = sinon.spy();
      mockUI.rollingDice = uiSpy;
      PLAYER_ACTIONS.ROLL_DICE.execute();
      expect(uiSpy.callCount).to.equal(1);
    });
  });
});
