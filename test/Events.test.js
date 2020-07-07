const expect = require("chai").expect;
const EventEmitter = require("events");
const sinon = require("sinon");
const { GameState } = require("../entities/GameState");
const { createPlayer } = require("./testutils");
const { PropertyService } = require("../entities/PropertyService");

describe("Events", () => {
  let gameState;
  let mockUI;
  let eventBusEmitter;
  let EVENTS;

  beforeEach(() => {
    gameState = new GameState();
    gameState.currentPlayerActions = {
      END_TURN: {
        execute: () => true,
      },
    };
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
    EVENTS = require("../entities/Events")(eventBusEmitter, mockUI, gameState);
    gameState.players = [createPlayer({ name: "player1" })];
  });
  afterEach(() => {
    // Restore the default sandbox here
    sinon.restore();
  });
  it("constructor should return object with associated event listeners", () => {
    for (property in EVENTS) {
      expect(typeof EVENTS[property]).to.equal("function");
    }
  });

  describe("startGame", () => {
    it("should emit start turn event", () => {
      const startTurnSpy = sinon.spy();
      eventBusEmitter.on("START_TURN", startTurnSpy);
      EVENTS.START_GAME();
      expect(startTurnSpy.callCount).to.equal(1);
    });
    it("should make ui call", () => {
      const uiSpy = sinon.spy();
      mockUI.startGame = uiSpy;
      EVENTS.START_GAME();
      expect(uiSpy.callCount).to.equal(1);
    });
  });
  describe("startTurn", () => {
    it("should reset speeding counter and turn taken flag", () => {
      gameState.speedingCounter = 1;
      gameState.turnTaken = true;
      EVENTS.START_TURN();
      expect(gameState.speedingCounter).to.equal(0);
      expect(gameState.turnTaken).to.be.false;
    });
    it("should emit continue turn event", () => {
      const continueTurnSpy = sinon.spy();
      eventBusEmitter.on("CONTINUE_TURN", continueTurnSpy);
      EVENTS.START_TURN();
      expect(continueTurnSpy.callCount).to.equal(1);
    });
    it("should make ui call", () => {
      const startTurnUISpy = sinon.spy();
      mockUI.startTurn = startTurnUISpy;
      EVENTS.START_TURN();
      expect(startTurnUISpy.callCount).to.equal(1);
      expect(startTurnUISpy.getCall(0).args).to.deep.equal([
        gameState.players[0],
      ]);
    });
  });
  describe("passGo", () => {
    it("should increase player cash by 200", () => {
      expect(gameState.currentPlayer.cash).to.equal(1500);
      EVENTS.PASS_GO();
      expect(gameState.currentPlayer.cash).to.equal(1700);
    });
    it("should make ui call", () => {
      const uiSpy = sinon.spy();
      mockUI.passGo = uiSpy;
      EVENTS.PASS_GO();
      expect(uiSpy.callCount).to.equal(1);
    });
  });
  describe("continueTurn", () => {
    beforeEach(() => {
      gameState.allPlayerActions = {
        ROLL_DICE: {
          execute: true,
          isAvailable: () => true,
          toggleDisplay: () => true,
        },
        END_TURN: {
          execute: true,
          isAvailable: () => false,
          toggleDisplay: () => true,
        },
      };
    });
    it("should make ui call", () => {
      const uiSpy = sinon.spy();
      mockUI.displayAvailableActions = uiSpy;
      EVENTS.CONTINUE_TURN();
      expect(uiSpy.callCount).to.equal(1);
    });
    it("should check availability of all player actions", () => {
      const uiRollDiceSpy = sinon.spy();
      const uiEndTurnSpy = sinon.spy();
      gameState._allPlayerActions["ROLL_DICE"].isAvailable = uiRollDiceSpy;
      gameState._allPlayerActions["END_TURN"].isAvailable = uiEndTurnSpy;
      EVENTS.CONTINUE_TURN();
      expect(
        uiRollDiceSpy.calledOnceWithExactly(gameState.currentPlayer, gameState)
      ).to.be.true;
      expect(
        uiEndTurnSpy.calledOnceWithExactly(gameState.currentPlayer, gameState)
      ).to.be.true;
    });
    it("should toggle display of all player actions", () => {
      const uiRollDiceSpy = sinon.spy();
      const uiEndTurnSpy = sinon.spy();
      gameState._allPlayerActions["ROLL_DICE"].toggleDisplay = uiRollDiceSpy;
      gameState._allPlayerActions["END_TURN"].toggleDisplay = uiEndTurnSpy;
      EVENTS.CONTINUE_TURN();
      expect(uiRollDiceSpy.calledOnceWithExactly(true)).to.be.true;
      expect(uiEndTurnSpy.calledOnceWithExactly(false)).to.be.true;
    });
    it("should remove actions that are unavailable from current player actions", () => {
      EVENTS.CONTINUE_TURN();
      expect(Object.keys(gameState.allPlayerActions).length).to.equal(2);
      expect(Object.keys(gameState.currentPlayerActions).length).to.equal(1);
    });
    it("should execute action if available", () => {
      const uiSpy = sinon.stub().callsFake(() => "roll_dice");
      const executeSpy = sinon.spy();
      gameState._allPlayerActions["ROLL_DICE"].execute = executeSpy;
      mockUI.prompt = uiSpy;
      EVENTS.CONTINUE_TURN();
      expect(uiSpy.callCount).to.be.equal(1);
      expect(executeSpy.callCount).to.be.equal(1);
    });
    it("should make error ui call if incorrect input is received for the action", () => {
      const uiSpy = sinon.stub().callsFake(() => undefined);
      const uiUnknownActionSpy = sinon.spy();
      mockUI.prompt = uiSpy;
      mockUI.unknownAction = uiUnknownActionSpy;
      EVENTS.CONTINUE_TURN();
      expect(uiSpy.callCount).to.be.equal(1);
      expect(uiUnknownActionSpy.callCount).to.be.equal(1);
    });
  });
  describe("diceRolled", () => {
    it("should set turn taken flag to true", () => {
      gameState.turnTaken = false;
      EVENTS.DICE_ROLLED([1, 2]);
      expect(gameState.turnTaken).to.be.true;
    });
    it("should make ui call", () => {
      const uiSpy = sinon.spy();
      mockUI.diceRollResults = uiSpy;
      EVENTS.DICE_ROLLED([1, 2]);
      expect(uiSpy.callCount).to.be.equal(1);
    });
    it("should update gamestate", () => {
      EVENTS.DICE_ROLLED([1, 2]);
      expect(gameState.lastRoll).to.equal(3);
    });

    describe("when in jail", () => {
      beforeEach(() => {
        gameState.currentPlayer.jailed = 0;
      });
      it("should make ui call", () => {
        const uiSpy = sinon.spy();
        mockUI.rollJailDice = uiSpy;
        EVENTS.DICE_ROLLED([1, 2]);
        expect(uiSpy.callCount).to.be.equal(1);
      });
      it("should increase jailed counter if roll is not doubles", () => {
        EVENTS.DICE_ROLLED([1, 2]);
        expect(gameState.currentPlayer.jailed).to.equal(1);
      });
      it("should emit enforce pay fine if jailed counter is over 2", () => {
        gameState.currentPlayer.jailed = 2;
        const enforcePayFineSpy = sinon.spy();
        eventBusEmitter.on("ENFORCE_PAY_FINE", enforcePayFineSpy);
        EVENTS.DICE_ROLLED([1, 2]);
        expect(enforcePayFineSpy.callCount).to.equal(1);
      });
      it("should reset jailed counter to -1 if roll is doubles", () => {
        EVENTS.DICE_ROLLED([1, 1]);
        expect(gameState.currentPlayer.jailed).to.equal(-1);
      });
      it("should move the player by the roll", () => {
        const movementSpy = sinon.spy();
        eventBusEmitter.on("MOVE_PLAYER", movementSpy);
        EVENTS.DICE_ROLLED([1, 1]);
        expect(movementSpy.callCount).to.equal(1);
        expect(movementSpy.calledOnceWithExactly(2)).to.be.true;
      });
    });

    describe("when not in jail", () => {
      it("should make ui call", () => {
        const uiSpy = sinon.spy();
        mockUI.rollNormalDice = uiSpy;
        EVENTS.DICE_ROLLED([1, 2]);
        expect(uiSpy.callCount).to.be.equal(1);
      });
      it("should increment speeding counter if roll is doubles", () => {
        gameState.speedingCounter = 0;
        EVENTS.DICE_ROLLED([1, 1]);
        expect(gameState.speedingCounter).to.equal(1);
      });
      it("should set speeding counter to zero if roll is not doubles", () => {
        gameState.speedingCounter = 0;
        EVENTS.DICE_ROLLED([1, 2]);
        expect(gameState.speedingCounter).to.equal(0);
      });
      it("should emit speeding if over 3 double rolls", () => {
        const speedingSpy = sinon.spy();
        eventBusEmitter.on("SPEEDING", speedingSpy);
        const movementSpy = sinon.spy();
        eventBusEmitter.on("MOVE_PLAYER", movementSpy);
        gameState.speedingCounter = 2;
        EVENTS.DICE_ROLLED([1, 1]);
        expect(gameState.speedingCounter).to.equal(3);
        expect(speedingSpy.callCount).to.equal(1);
        expect(movementSpy.callCount).to.equal(0);
      });
      it("should emit move the player by the roll", () => {
        const movementSpy = sinon.spy();
        eventBusEmitter.on("MOVE_PLAYER", movementSpy);
        EVENTS.DICE_ROLLED([1, 1]);
        expect(movementSpy.callCount).to.equal(1);
        expect(movementSpy.calledOnceWithExactly(2)).to.be.true;
      });
    });
  });
  describe("movePlayer", () => {
    it("should make ui call for results", () => {
      gameState.currentPlayer.position = 10;
      const uiSpy = sinon.spy();
      mockUI.playerMovement = uiSpy;
      EVENTS.MOVE_PLAYER(10);
      expect(uiSpy.callCount).to.be.equal(1);
      expect(uiSpy.calledOnceWithExactly(20)).to.be.true;
    });
    it("should emit pass go when player wraps around board", () => {
      gameState.currentPlayer.position = 39;
      const passGoSpy = sinon.spy();
      eventBusEmitter.on("PASS_GO", passGoSpy);
      EVENTS.MOVE_PLAYER(10);
      expect(passGoSpy.callCount).to.equal(1);
    });
    it("should land on the correct tile position", () => {
      const propertyServiceStub = sinon.spy(PropertyService, "landOn");
      gameState.currentPlayer.position = 39;
      EVENTS.MOVE_PLAYER(10);
      expect(propertyServiceStub.calledOnceWithExactly(9)).to.be.true;
    });
    it("should continue the player's turn", () => {
      const continueTurnSpy = sinon.spy();
      eventBusEmitter.on("CONTINUE_TURN", continueTurnSpy);
      EVENTS.MOVE_PLAYER(1);
      expect(continueTurnSpy.callCount).to.equal(1);
    });
  });
  describe("speeding", () => {
    it("should make ui call for results", () => {
      const uiSpy = sinon.spy();
      mockUI.caughtSpeeding = uiSpy;
      EVENTS.SPEEDING();
      expect(uiSpy.callCount).to.be.equal(1);
    });
    it("should send the player to jail", () => {
      const jailSpy = sinon.spy();
      eventBusEmitter.on("JAIL", jailSpy);
      EVENTS.SPEEDING();
      expect(jailSpy.callCount).to.equal(1);
    });
  });
  describe("jail", () => {
    it("should make ui call for dice roll results", () => {
      const uiSpy = sinon.spy();
      mockUI.jail = uiSpy;
      EVENTS.JAIL();
      expect(uiSpy.callCount).to.be.equal(1);
    });
    it("should set jailed counter", () => {
      EVENTS.JAIL();
      expect(gameState.currentPlayer.jailed).to.equal(0);
    });
    it("should update player's position to jail", () => {
      EVENTS.JAIL();
      expect(gameState.currentPlayer.position).to.equal(10);
    });
    it("should immediately end the player's turn", () => {
      const endTurnSpy = sinon.spy();
      gameState.currentPlayerActions["END_TURN"].execute = endTurnSpy;
      EVENTS.JAIL();
      expect(endTurnSpy.callCount).to.equal(1);
    });
  });
});
