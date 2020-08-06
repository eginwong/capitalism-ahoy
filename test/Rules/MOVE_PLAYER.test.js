const expect = require('chai').expect;
const EventEmitter = require('events');
const sinon = require('sinon');
const mockUIFactory = require('../mocks/UI');

const { GameState } = require('../../entities/GameState');
const { createPlayer } = require('../testutils');
const config = require('../../config/monopolyConfiguration');

describe('Rules -> MOVE_PLAYER', () => {
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

  describe('movePlayer', () => {
    const inputEvent = 'MOVE_PLAYER';
    const passGoEvent = 'PASS_GO';

    let passGoSpy;

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

      passGoSpy = sinon.spy();
      eventBus.on(passGoEvent, passGoSpy);
    });

    it('should make a call to the UI#playerMovement', () => {
      gameState.currentPlayer.position = 10;
      const uiSpy = sinon.spy();
      userInterface.playerMovement = uiSpy;
      eventBus.emit(inputEvent);
      expect(uiSpy.calledOnceWithExactly(13)).to.equal(
        true,
        `UI method for ${inputEvent} was not called`
      );
    });
    it('should emit pass go when player wraps around board', () => {
      gameState.currentPlayer.position = 39;
      eventBus.emit(inputEvent);
      expect(gameState.currentPlayer.position).to.equal(
        2,
        'Current Player position was not updated'
      );
      expect(passGoSpy.callCount).to.equal(
        1,
        'Move Player did not wrap around the board'
      );
    });
    it('should not emit pass go if player does not wrap around board', () => {
      gameState.currentPlayer.position = 36;
      eventBus.emit(inputEvent);
      expect(gameState.currentPlayer.position).to.equal(
        39,
        'Current Player position was not updated'
      );
      expect(passGoSpy.callCount).to.equal(
        0,
        'Move Player emitted pass go event without wrapping around the board'
      );
    });
  });
});
