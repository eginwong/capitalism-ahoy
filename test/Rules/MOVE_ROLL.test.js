const expect = require('chai').expect;
const EventEmitter = require('events');
const sinon = require('sinon');
const mockUIFactory = require('../mocks/UI');

const { GameState } = require('../../entities/GameState');
const { createPlayerFactory } = require('../testutils');

describe('Rules -> MOVE_ROLL', () => {
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

  describe('moveRoll', () => {
    const inputEvent = 'MOVE_ROLL';
    const turnValuesUpdatedEvent = 'TURN_VALUES_UPDATED';
    const movePlayerEvent = 'MOVE_PLAYER';
    const speedingEvent = 'SPEEDING';

    let speedingSpy;
    let movePlayerSpy;
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

      speedingSpy = sinon.spy();
      turnValuesUpdatedSpy = sinon.spy();
      movePlayerSpy = sinon.spy();

      eventBus.on(speedingEvent, speedingSpy);
      eventBus.on(turnValuesUpdatedEvent, turnValuesUpdatedSpy);
      eventBus.on(movePlayerEvent, movePlayerSpy);
    });

    it('should make a call to the UI#rollNormalDice', () => {
      const uiSpy = sinon.spy();
      userInterface.rollNormalDice = uiSpy;
      eventBus.emit(inputEvent);
      expect(uiSpy.calledOnce).to.equal(
        true,
        `Initial UI method for ${inputEvent} was not called`
      );
    });
    it(`should update speedingCounter to 0 if no doubles rolled`, () => {
      gameState.turnValues = {
        roll: [1, 2],
      };
      eventBus.emit(inputEvent);
      expect(gameState.turnValues.speedingCounter).to.equal(
        0,
        'GameState speedingCounter should be 0 with roll results'
      );
    });
    it(`should update speedingCounter to +1 if doubles rolled`, () => {
      gameState.turnValues = {
        roll: [1, 1],
        speedingCounter: 0,
      };
      eventBus.emit(inputEvent);
      expect(gameState.turnValues.speedingCounter).to.equal(
        1,
        'GameState speedingCounter should be +1 with roll results'
      );
    });
    it(`should emit ${turnValuesUpdatedEvent} event after dice roll`, () => {
      eventBus.emit(inputEvent);
      expect(turnValuesUpdatedSpy.calledOnce).to.equal(
        true,
        `${turnValuesUpdatedEvent} event was not called`
      );
    });
    it(`should emit ${speedingEvent} event if speeding counter is greater than 2`, () => {
      gameState.turnValues = {
        roll: [1, 1],
        speedingCounter: 2,
      };
      eventBus.emit(inputEvent);
      expect(speedingSpy.callCount).to.equal(
        1,
        `${speedingEvent} event was not called`
      );
    });
    it(`should not emit ${speedingEvent} event if speeding counter is less than 2`, () => {
      gameState.turnValues = {
        roll: [1, 1],
        speedingCounter: 1,
      };
      eventBus.emit(inputEvent);
      expect(speedingSpy.callCount).to.equal(
        0,
        `${speedingEvent} event was called`
      );
    });
    it(`should emit ${movePlayerEvent} event if player is not caught speeding`, () => {
      eventBus.emit(inputEvent);
      expect(movePlayerSpy.callCount).to.equal(
        1,
        `${movePlayerEvent} event was not called`
      );
    });
    it(`should not emit ${movePlayerEvent} event if player is caught speeding`, () => {
      gameState.turnValues = {
        roll: [1, 1],
        speedingCounter: 2,
      };
      eventBus.emit(inputEvent);
      expect(movePlayerSpy.callCount).to.equal(
        0,
        `${movePlayerEvent} event was called`
      );
    });
  });
});
