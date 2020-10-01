const expect = require('chai').expect;
const EventEmitter = require('events');
const sinon = require('sinon');
const mockUIFactory = require('../mocks/UI');

const { GameState } = require('../../entities/GameState');
const { createPlayerFactory } = require('../testutils');

describe('Rules -> JAIL_ROLL', () => {
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
  });

  afterEach(() => {
    // Restore the default sandbox here
    sinon.restore();
  });

  describe('jailRoll', () => {
    const inputEvent = 'JAIL_ROLL';
    const updatePositionWithRollEvent = 'UPDATE_POSITION_WITH_ROLL';
    const payFineEvent = 'PAY_FINE';

    let payFineSpy;
    let updatePositionWithRollSpy;

    beforeEach(() => {
      let { emit: notify } = eventBus;
      notify = notify.bind(eventBus);

      RULES[inputEvent].forEach((handler) =>
        eventBus.on(
          inputEvent,
          handler.bind(null, { notify, UI: userInterface }, gameState)
        )
      );
      gameState.currentPlayer.jailed = 0;
      gameState.turnValues = {
        roll: [1, 2],
      };
      payFineSpy = sinon.spy();
      updatePositionWithRollSpy = sinon.spy();

      eventBus.on(payFineEvent, payFineSpy);
      eventBus.on(updatePositionWithRollEvent, updatePositionWithRollSpy);
    });

    it('should make a call to the UI#rollJailDice', () => {
      const uiSpy = sinon.spy();
      userInterface.rollJailDice = uiSpy;
      eventBus.emit(inputEvent);
      expect(uiSpy.calledOnce).to.equal(
        true,
        `Initial UI method for ${inputEvent} was not called`
      );
    });
    it(`should increase jailed counter if roll is not doubles`, () => {
      eventBus.emit(inputEvent);
      expect(gameState.currentPlayer.jailed).to.equal(
        1,
        "Player's jail count did not increase"
      );
    });
    it('should reset jailed counter to -1 if roll is doubles', () => {
      gameState.turnValues = {
        roll: [1, 1],
      };
      eventBus.emit(inputEvent);
      expect(gameState.currentPlayer.jailed).to.equal(
        -1,
        'Jailed counter was not reset'
      );
    });
    it('should not emit enforce pay fine if jailed counter is less than or equal to 2', () => {
      gameState.currentPlayer.jailed = 1;
      eventBus.emit(inputEvent);
      expect(payFineSpy.callCount).to.equal(
        0,
        `${payFineEvent} event was called`
      );
    });
    it('should enforce pay fine if jailed counter is greater than 2', () => {
      gameState.currentPlayer.jailed = 3;
      eventBus.emit(inputEvent);
      expect(payFineSpy.callCount).to.equal(
        1,
        `${payFineEvent} event was called`
      );
    });
    it(`should emit ${updatePositionWithRollEvent} event if player is not in jail`, () => {
      gameState.turnValues = {
        roll: [1, 1],
      };
      eventBus.emit(inputEvent);
      expect(updatePositionWithRollSpy.callCount).to.equal(
        1,
        `${updatePositionWithRollEvent} event was not called`
      );
    });
  });
});
