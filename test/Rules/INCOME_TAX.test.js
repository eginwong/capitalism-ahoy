const expect = require('chai').expect;
const EventEmitter = require('events');
const sinon = require('sinon');
const mockUIFactory = require('../mocks/UI');

const { GameState } = require('../../entities/GameState');
const { createPlayerFactory } = require('../testutils');
const config = require('../../config/monopolyConfiguration');
const PlayerActions = require('../../entities/PlayerActions');

describe('Rules -> INCOME_TAX', () => {
  let gameState;
  let userInterface;
  let eventBus;
  const RULES = require('../../entities/Rules');

  beforeEach(() => {
    gameState = new GameState();
    eventBus = new EventEmitter();
    userInterface = mockUIFactory();
    let createPlayer = createPlayerFactory();
    gameState.players = [createPlayer({ name: 'player1' })];
    gameState.config = config;
  });

  afterEach(() => {
    // Restore the default sandbox here
    sinon.restore();
  });

  describe('incomeTax', () => {
    const inputEvent = 'INCOME_TAX';

    let incomeTaxSpy;

    beforeEach(() => {
      let { emit: notify } = eventBus;
      notify = notify.bind(eventBus);

      RULES[inputEvent].forEach((handler) =>
        eventBus.on(
          inputEvent,
          handler.bind(null, { notify, UI: userInterface }, gameState)
        )
      );

      incomeTaxSpy = sinon.spy();
      eventBus.on(inputEvent, incomeTaxSpy);
    });

    it('should make a call to the UI#incomeTaxPayment', () => {
      const uiSpy = sinon.spy();
      userInterface.incomeTaxPayment = uiSpy;
      const promptStub = sinon.stub(PlayerActions, 'prompt');
      promptStub.onCall(0).returns('FIXED');

      eventBus.emit(inputEvent);
      expect(
        uiSpy.calledOnceWithExactly(
          gameState.config.incomeTaxAmount,
          gameState.config.incomeTaxRate * 100
        )
      ).to.equal(true, `Initial UI method for ${inputEvent} was not called`);
    });
    it('should make a call to the UI#unknownAction if action input is not recognized', () => {
      const uiSpy = sinon.spy();
      userInterface.unknownAction = uiSpy;

      const promptStub = sinon.stub(PlayerActions, 'prompt');
      promptStub.onCall(0).returns(undefined);
      promptStub.onCall(1).returns('FIXED');

      eventBus.emit(inputEvent);
      expect(uiSpy.calledOnce).to.equal(
        true,
        `UI method for ${inputEvent} was not called`
      );
      expect(incomeTaxSpy.callCount).to.equal(
        2,
        `Unknown action did not trigger ${inputEvent} event again`
      );
    });
    it('should decrease player cash by config incomeTaxAmount if player chooses FIXED', () => {
      const startingCash = gameState.currentPlayer.cash;
      const promptStub = sinon.stub(PlayerActions, 'prompt');
      promptStub.onCall(0).returns('FIXED');

      eventBus.emit(inputEvent);
      expect(gameState.currentPlayer.cash).to.equal(
        startingCash - config.incomeTaxAmount,
        `Player did not pay $${config.incomeTaxAmount} when FIXED was chosen for payment`
      );
    });
    it('should make a call to the UI#incomeTaxPaid for FIXED', () => {
      const uiSpy = sinon.spy();
      userInterface.incomeTaxPaid = uiSpy;
      const promptStub = sinon.stub(PlayerActions, 'prompt');
      promptStub.onCall(0).returns('FIXED');

      eventBus.emit(inputEvent);
      expect(
        uiSpy.calledOnceWithExactly(gameState.config.incomeTaxAmount)
      ).to.equal(
        true,
        `UI method for ${inputEvent} to display fee was not called`
      );
    });
    it('should decrease player cash by config incomeTaxRate if player chooses VARIABLE', () => {
      const startingCash = gameState.currentPlayer.cash;
      const promptStub = sinon.stub(PlayerActions, 'prompt');
      promptStub.onCall(0).returns('VARIABLE');

      eventBus.emit(inputEvent);
      expect(gameState.currentPlayer.cash).to.equal(
        startingCash - startingCash * config.incomeTaxRate,
        `Player did not pay $${
          100 * config.incomeTaxRate
        }% of networth when VARIABLE was chosen for payment `
      );
    });
    it('should decrease player cash by config incomeTaxRate if player chooses VARIABLE, rounded to 2 decimal places', () => {
      const startingCash = gameState.currentPlayer.cash;
      const assets = 11; // arbitrary value
      gameState.currentPlayer.assets = assets;
      const promptStub = sinon.stub(PlayerActions, 'prompt');
      promptStub.onCall(0).returns('VARIABLE');

      eventBus.emit(inputEvent);
      expect(gameState.currentPlayer.cash).to.equal(
        startingCash -
          ((startingCash + assets) * config.incomeTaxRate).toFixed(2),
        `Player did not pay $${
          100 * config.incomeTaxRate
        }% of networth when VARIABLE was chosen for payment `
      );
    });
    it('should decrease player cash by config incomeTaxRate if player chooses VARIABLE, rounded to 2 decimal places', () => {
      const startingCash = gameState.currentPlayer.cash;
      const assets = 11;
      gameState.currentPlayer.assets = assets;
      const promptStub = sinon.stub(PlayerActions, 'prompt');
      promptStub.onCall(0).returns('VARIABLE');

      eventBus.emit(inputEvent);
      expect(gameState.currentPlayer.cash).to.equal(
        startingCash -
          ((startingCash + assets) * config.incomeTaxRate).toFixed(2),
        `Player did not pay ${
          100 * config.incomeTaxRate
        }% of networth when VARIABLE was chosen for payment `
      );
    });
    it('should make a call to the UI#incomeTaxPaid for VARIABLE', () => {
      const uiSpy = sinon.spy();
      userInterface.incomeTaxPaid = uiSpy;
      const promptStub = sinon.stub(PlayerActions, 'prompt');
      promptStub.onCall(0).returns('VARIABLE');
      const expectedFee = (
        gameState.config.incomeTaxRate * gameState.currentPlayer.cash
      ).toFixed(2);

      eventBus.emit(inputEvent);
      expect(uiSpy.calledOnceWithExactly(expectedFee)).to.equal(
        true,
        `UI method for ${inputEvent} to display fee was not called`
      );
    });
  });
});
