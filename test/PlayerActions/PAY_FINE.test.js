const expect = require("chai").expect;
const EventEmitter = require("events");
const sinon = require("sinon");

const mockUIFactory = require('../mocks/UI');

const { GameState } = require("../../entities/GameState");
const { createPlayer } = require("../testutils");

describe("PlayerActions -> PAY_FINE", () => {
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

  describe("payFine", () => {
    // The method under test
    let methodUnderTest;
    // Output Event from "rollDice"'s emit
    const bankruptcyEvent = "BANKRUPTCY";
    const liquidationEvent = "LIQUIDATION";
    let bankruptcySpy, liquidationSpy;

    beforeEach(() => {
      bankruptcySpy = sinon.spy();
      liquidationSpy = sinon.spy();
      // Clear default listeners to prevent side-effects*
      eventBusEmitter.removeAllListeners(bankruptcyEvent);
      eventBusEmitter.on(bankruptcyEvent, bankruptcySpy);

      eventBusEmitter.removeAllListeners(liquidationEvent);
      eventBusEmitter.on(liquidationEvent, liquidationSpy);

      methodUnderTest = PLAYER_ACTIONS.PAY_FINE.execute;
    });

    it(`the current player should lose $50`, () => {
      gameState.currentPlayer.cash = 50;
      methodUnderTest();
      expect(gameState.currentPlayer.cash).to.equal(0, "Player did not lose $50");
    });

    describe("the current player has or has more than $50", () => {
      it(`the player's jail state should be unset`, () => {
        gameState.currentPlayer.cash = 50;
        methodUnderTest();
        expect(gameState.currentPlayer.jailed).to.equal(-1, "Player's jailed state was not unset");
      });
    });

    describe("after paying the fine, the current player is bankrupt", () => {
      // TODO: Tabulate
      beforeEach(() => {
        gameState.currentPlayer.netWorth = 0;
        gameState.currentPlayer.cash = 0;
      });

      it(`the ${ bankruptcyEvent } event should be called`, () => {
        methodUnderTest();
        expect(bankruptcySpy.callCount).to.equal(1, `${ bankruptcyEvent } was not called`);
      });
    });

    describe("after paying the fine, the current player needs to liquidate", () => {
      // TODO: Tabulate
      beforeEach(() => {
        gameState.currentPlayer.netWorth = 200;
        gameState.currentPlayer.cash = 0;
      });

      it(`the ${ liquidationEvent } event should be called`, () => {
        methodUnderTest();
        expect(liquidationSpy.callCount).to.equal(1, `${ liquidationEvent } was not called`);
      })
    });
  });

  describe("isAvailable", () => {
    let methodUnderTest;

    beforeEach(() => {
      methodUnderTest = PLAYER_ACTIONS.PAY_FINE.isAvailable.bind(null, undefined, gameState);
    });

    it("METHOD NOT IMPLEMENTED", () => {
      let result = methodUnderTest();
      expect(result).to.equal(true, "WAS ALWAYS TRUE - CODE WAS CHANGED");
    });
  });

  describe("toggleDisplay", () => {
    let methodUnderTest;

    beforeEach(() => {
      methodUnderTest = PLAYER_ACTIONS.PAY_FINE.toggleDisplay;
    });

    it("should call the UI#payFineDisplay and pass a bool", () => {
      const uiSpy = sinon.spy(mockUI, "payFineDisplay");
      methodUnderTest(true);

      expect(uiSpy.callCount).to.equal(1, "UI method was not called");
      const [output] = uiSpy.firstCall.args;
      expect(output).to.equal(true, "UI method did not receive bool");
    });
  });
});