const expect = require('chai').expect;
const EventEmitter = require('events');
const sinon = require('sinon');
const mockUIFactory = require('../mocks/UI');

const { GameState } = require('../../entities/GameState');
const { createPlayerFactory } = require('../testutils');
const config = require('../../config/monopolyConfiguration');
const { cloneDeep } = require('lodash');

describe('Rules -> UPDATE_POSITION_WITH_ROLL', () => {
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
    gameState.config = cloneDeep(config);
  });

  afterEach(() => {
    // Restore the default sandbox here
    sinon.restore();
  });

  describe('updatePositionWithRoll', () => {
    const inputEvent = 'UPDATE_POSITION_WITH_ROLL';
    const movePlayerEvent = 'MOVE_PLAYER';

    let movePlayerSpy;

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
      };
      movePlayerSpy = sinon.spy();

      eventBus.on(movePlayerEvent, movePlayerSpy);
    });

    it('should set gameState current player position', () => {
      const originalPosition = 10;
      gameState.currentPlayer.position = originalPosition;
      const diceRoll = gameState.turnValues.roll.reduce(
        (prev, curr) => prev + curr,
        0
      );

      eventBus.emit(inputEvent);
      expect(gameState.currentPlayer.position).to.equal(
        originalPosition + diceRoll,
        `GameState current player position is not updated from ${inputEvent}`
      );
    });
    it(`should notify ${movePlayerEvent}`, () => {
      eventBus.emit(inputEvent);
      expect(
        movePlayerSpy.callCount,
        1,
        `${movePlayerEvent} was not called as a result of ${inputEvent}`
      );
    });
  });
});
