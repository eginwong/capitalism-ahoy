const expect = require('chai').expect;
const EventEmitter = require('events');
const sinon = require('sinon');
const mockUIFactory = require('../mocks/UI');

const { GameState } = require('../../entities/GameState');
const { createPlayer } = require('../testutils');
const config = require('../../config/monopolyConfiguration');

describe('Rules -> PASS_GO', () => {
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

  describe('passGo', () => {
    const inputEvent = 'PASS_GO';

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

    it('should make a call to the UI#passGo', () => {
      const uiSpy = sinon.spy();
      userInterface.passGo = uiSpy;
      eventBus.emit(inputEvent);
      expect(uiSpy.calledOnce).to.equal(
        true,
        `Initial UI method for ${inputEvent} was not called`
      );
    });
    it('should increase player cash by 200', () => {
      eventBus.emit(inputEvent);
      expect(gameState.currentPlayer.cash).to.equal(
        1700,
        'Player passed GO and did not collect $200'
      );
    });
  });
});
