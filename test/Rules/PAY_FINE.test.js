const expect = require('chai').expect;
const EventEmitter = require('events');
const sinon = require('sinon');
const mockUIFactory = require('../mocks/UI');

const { GameState } = require('../../entities/GameState');
const { createPlayer } = require('../testutils');
const config = require('../../config/monopolyConfiguration');

describe('Rules -> PAY_FINE', () => {
  let gameState;
  let userInterface;
  let eventBus;
  const RULES = require('../../entities/Rules');

  beforeEach(() => {
    gameState = new GameState();
    eventBus = new EventEmitter();
    userInterface = mockUIFactory();
    gameState.players = [createPlayer({ name: 'player1' })];
    gameState.config = config;
  });

  afterEach(() => {
    // Restore the default sandbox here
    sinon.restore();
  });

  describe('moveRoll', () => {
    const inputEvent = 'PAY_FINE';
    const bankruptcyEvent = 'BANKRUPTCY';
    const liquidationEvent = 'LIQUIDATION';
    const continueTurnEvent = 'CONTINUE_TURN';

    let bankruptcySpy;
    let liquidationSpy;
    let continueTurnSpy;

    beforeEach(() => {
      let { emit: notify } = eventBus;
      notify = notify.bind(eventBus);

      RULES[inputEvent].forEach((handler) =>
        eventBus.on(
          inputEvent,
          handler.bind(null, { notify, UI: userInterface }, gameState)
        )
      );
      bankruptcySpy = sinon.spy();
      liquidationSpy = sinon.spy();
      continueTurnSpy = sinon.spy();

      eventBus.on(bankruptcyEvent, bankruptcySpy);
      eventBus.on(liquidationEvent, liquidationSpy);
      eventBus.on(continueTurnEvent, continueTurnSpy);
    });

    it('should make a call to the UI#payFine', () => {
      const uiSpy = sinon.spy();
      userInterface.payFine = uiSpy;
      eventBus.emit(inputEvent);
      expect(uiSpy.calledOnce).to.equal(
        true,
        `Initial UI method for ${inputEvent} was not called`
      );
    });
    it(`should set player free from jail`, () => {
      eventBus.emit(inputEvent);
      expect(gameState.currentPlayer.jailed).to.equal(
        -1,
        'Player is still in jail after paying fine'
      );
    });
    it(`the current player should lose $50`, () => {
      gameState.currentPlayer.cash = 50;
      eventBus.emit(inputEvent);
      expect(gameState.currentPlayer.cash).to.equal(
        0,
        'Player did not lose $50'
      );
    });
    it(`should set player free from jail`, () => {
      eventBus.emit(inputEvent);
      expect(gameState.currentPlayer.jailed).to.equal(
        -1,
        'Player is still in jail after paying fine'
      );
    });
    it(`the ${bankruptcyEvent} event should be called if player has negative net-worth`, () => {
      gameState.currentPlayer.netWorth = 0;
      gameState.currentPlayer.cash = 0;
      eventBus.emit(inputEvent);
      expect(bankruptcySpy.callCount).to.equal(
        1,
        `${bankruptcyEvent} was not called`
      );
    });
    it(`the ${liquidationEvent} event should be called if current player has no more cash but positive net-worth`, () => {
      gameState.currentPlayer.netWorth = 200;
      gameState.currentPlayer.cash = 0;
      eventBus.emit(inputEvent);
      expect(liquidationSpy.callCount).to.equal(
        1,
        `${liquidationEvent} was not called`
      );
    });
    it(`the ${continueTurnEvent} event should be called`, () => {
      eventBus.emit(inputEvent);
      expect(continueTurnSpy.callCount).to.equal(
        1,
        `${continueTurnEvent} was not called`
      );
    });
  });
});
