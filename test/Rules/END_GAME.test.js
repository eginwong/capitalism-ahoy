const expect = require('chai').expect;
const EventEmitter = require('events');
const sinon = require('sinon');
const mockUIFactory = require('../mocks/UI');

const { GameState } = require('../../entities/GameState');
const { createPlayerFactory } = require('../testutils');
const PlayerActions = require('../../entities/PlayerActions');

describe('Rules -> END_GAME', () => {
  let gameState;
  let userInterface;
  let eventBus;
  const RULES = require('../../entities/Rules');

  beforeEach(() => {
    gameState = new GameState();
    eventBus = new EventEmitter();
    userInterface = mockUIFactory();
    let createPlayer = createPlayerFactory();
    gameState.players = [
      createPlayer({ name: 'player1' }),
      createPlayer({ name: 'player2' }),
      createPlayer({ name: 'player3' }),
    ];
  });

  afterEach(() => {
    // Restore the default sandbox here
    sinon.restore();
  });

  describe('endGame', () => {
    const inputEvent = 'END_GAME';

    beforeEach(() => {
      let { emit: notify } = eventBus;
      notify = notify.bind(eventBus);

      RULES[inputEvent].forEach((handler) =>
        eventBus.on(
          inputEvent,
          handler.bind(null, { notify, UI: userInterface }, gameState)
        )
      );
    });

    it('should not continue with game over actions if player cancels', () => {
      const uiSpy = sinon.spy();
      userInterface.gameOver = uiSpy;
      const confirmStub = sinon.stub(PlayerActions, 'confirm');
      confirmStub.returns(false);

      eventBus.emit(inputEvent);

      expect(uiSpy.calledOnce).to.equal(
        false,
        `UI method for ${inputEvent} was called`
      );
    });
    it('should not prompt player if game is over', () => {
      gameState.gameOver = true;
      const uiSpy = sinon.spy();
      userInterface.confirm = uiSpy;

      eventBus.emit(inputEvent);

      expect(uiSpy.calledOnce).to.equal(
        false,
        `UI method for ${inputEvent} was called`
      );
    });
    it('should prompt player if game is not over', () => {
      const confirmStub = sinon.stub(PlayerActions, 'confirm');
      confirmStub.returns(true);
      eventBus.emit(inputEvent);

      expect(confirmStub.calledOnce).to.equal(
        true,
        `UI method for ${inputEvent} was called`
      );
    });
    it('should make a call to the UI#gameOver', () => {
      const uiSpy = sinon.spy();
      userInterface.gameOver = uiSpy;
      eventBus.emit(inputEvent);
      expect(uiSpy.calledOnce).to.equal(
        true,
        `UI method for ${inputEvent} was not called`
      );
    });
    it('should pass highest net worth player to the UI#gameOver', () => {
      gameState.players[0].cash = 1300;
      gameState.players[0].assets = 400;
      const uiSpy = sinon.spy();
      userInterface.gameOver = uiSpy;
      eventBus.emit(inputEvent);
      expect(uiSpy.calledOnceWithExactly('player1', 1700)).to.equal(
        true,
        `UI method for ${inputEvent} was not called with correct parameters`
      );
    });
  });
});
