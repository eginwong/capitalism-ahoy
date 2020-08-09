const expect = require('chai').expect;
const EventEmitter = require('events');
const sinon = require('sinon');
const mockUIFactory = require('../mocks/UI');

const { GameState } = require('../../entities/GameState');
const { createPlayer } = require('../testutils');
const config = require('../../config/monopolyConfiguration');

describe('Rules -> START_TURN', () => {
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

  describe('startTurn', () => {
    const inputEvent = 'START_TURN';
    const turnValuesResetEvent = 'TURN_VALUES_RESET';
    const continueTurnEvent = 'CONTINUE_TURN';
    let continueTurnSpy;
    let turnValuesResetSpy;

    beforeEach(() => {
      let { emit: notify } = eventBus;
      notify = notify.bind(eventBus);

      RULES[inputEvent].forEach((handler) =>
        eventBus.on(
          inputEvent,
          handler.bind(null, { notify, UI: userInterface }, gameState)
        )
      );
      continueTurnSpy = sinon.spy();
      turnValuesResetSpy = sinon.spy();
      eventBus.on(continueTurnEvent, continueTurnSpy);
      eventBus.on(turnValuesResetEvent, turnValuesResetSpy);
    });

    it(`should emit ${continueTurnEvent} event`, () => {
      eventBus.emit(inputEvent);
      expect(continueTurnSpy.callCount).to.equal(
        1,
        `${continueTurnEvent} event was not called`
      );
    });
    it('should reset speeding counter and emit reset event', () => {
      // simulate start of a turn
      require('../../entities/Rules/resetTurnAssociatedValues')({
        speedingCounter: 1,
      })(gameState);
      eventBus.emit(inputEvent);
      expect(gameState.turnValues.speedingCounter).to.equal(
        0,
        'Speeding counter should be reset to 0'
      );
      expect(turnValuesResetSpy.callCount).to.equal(
        1,
        `${turnValuesResetEvent} event was not called`
      );
    });
    it('should call UI#startTurn', () => {
      const uiSpy = sinon.spy();
      userInterface.startTurn = uiSpy;
      eventBus.emit(inputEvent);
      expect(uiSpy.calledOnceWithExactly(gameState.currentPlayer)).to.equal(
        true,
        `UI method #startTurn for ${inputEvent} was not called`
      );
    });
    it('should set gameState current board property', () => {
      gameState.currentPlayer.position = 10;
      eventBus.emit(inputEvent);
      const expectedBoardProperty = {
        name: 'Jail / Just Visiting',
        id: 'jail',
        position: 10,
        group: 'Special',
      };
      expect(gameState.currentBoardProperty).to.deep.equal(
        expectedBoardProperty,
        `GameState currentBoardProperty is not set`
      );
    });
    it('should call UI#playerDetails', () => {
      const uiSpy = sinon.spy();
      userInterface.playerDetails = uiSpy;
      eventBus.emit(inputEvent);
      expect(uiSpy.calledOnceWithExactly(gameState.currentPlayer)).to.equal(
        true,
        `UI method #playerDetails for ${inputEvent} was not called`
      );
    });
  });
});
