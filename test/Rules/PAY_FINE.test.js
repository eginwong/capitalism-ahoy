const expect = require('chai').expect;
const EventEmitter = require('events');
const sinon = require('sinon');
const mockUIFactory = require('../mocks/UI');

const { GameState } = require('../../entities/GameState');
const { createPlayerFactory } = require('../testutils');
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
    let createPlayer = createPlayerFactory();
    gameState.players = [createPlayer({ name: 'player1' })];
    gameState.config = config;
  });

  afterEach(() => {
    // Restore the default sandbox here
    sinon.restore();
  });

  describe('payFine', () => {
    const inputEvent = 'PAY_FINE';
    const collectionsEvent = 'COLLECTIONS';
    const turnValuesUpdatedEvent = 'TURN_VALUES_UPDATED';

    let collectionsSpy;
    let turnValuesUpdatedSpy;

    beforeEach(() => {
      let { emit: notify } = eventBus;
      notify = notify.bind(eventBus);

      RULES[inputEvent].forEach((handler) =>
        eventBus.on(
          inputEvent,
          handler.bind(null, { notify, UI: userInterface }, gameState)
        )
      );
      gameState.turnValues = {
        roll: [1, 2],
        speedingCounter: 0,
      };
      collectionsSpy = sinon.stub();
      turnValuesUpdatedSpy = sinon.spy();

      eventBus.on(collectionsEvent, collectionsSpy);
      eventBus.on(turnValuesUpdatedEvent, turnValuesUpdatedSpy);
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
    it(`the current player should lose config fineAmount`, () => {
      const startingCash = 50;
      gameState.currentPlayer.cash = startingCash;
      eventBus.emit(inputEvent);
      expect(gameState.currentPlayer.cash).to.equal(
        startingCash - config.fineAmount,
        `Player did not lose $${config.fineAmount}`
      );
    });
    it(`${collectionsEvent} event sets the turn value subturn player id and charge`, () => {
      gameState.currentPlayer.cash = 0;
      eventBus.emit(inputEvent);

      expect(gameState.turnValues.subTurn).to.deep.equal(
        {
          playerId: gameState.currentPlayer.id,
          charge: gameState.config.fineAmount,
        },
        `${turnValuesUpdatedEvent} event has the subturn player id and charge incorrectly set`
      );
      expect(turnValuesUpdatedSpy.callCount).to.equal(
        1,
        `${turnValuesUpdatedEvent} was not called`
      );
    });
    it(`${collectionsEvent} event should be called if current player has no more cash to pay the fine`, () => {
      gameState.currentPlayer.cash = 0;
      eventBus.emit(inputEvent);

      expect(collectionsSpy.callCount).to.equal(
        1,
        `${collectionsEvent} was not called`
      );
    });
  });
});
