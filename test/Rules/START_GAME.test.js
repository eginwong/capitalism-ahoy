const expect = require('chai').expect;
const EventEmitter = require('events');
const sinon = require('sinon');
const mockUIFactory = require('../mocks/UI');

const { GameState } = require('../../entities/GameState');
const { createPlayer } = require('../testutils');

describe('Rules -> START_GAME', () => {
  let gameState;
  let userInterface;
  let eventBus;
  const RULES = require('../../entities/Rules');

  beforeEach(() => {
    gameState = new GameState();
    eventBus = new EventEmitter();
    userInterface = mockUIFactory();
    gameState.players = [createPlayer({ name: 'player1' })];
  });

  afterEach(() => {
    // Restore the default sandbox here
    sinon.restore();
  });

  describe('startGame', () => {
    const inputEvent = 'START_GAME';
    const outputEvent = 'START_TURN';
    let outputSpy;

    beforeEach(() => {
      let { emit: notify } = eventBus;
      notify = notify.bind(eventBus);

      RULES[inputEvent].forEach((handler) =>
        eventBus.on(
          inputEvent,
          handler.bind(null, { notify, UI: userInterface }, gameState)
        )
      );
      outputSpy = sinon.spy();
      eventBus.on(outputEvent, outputSpy);
    });

    it(`should emit ${outputEvent} event`, () => {
      eventBus.emit(inputEvent);
      expect(outputSpy.callCount).to.equal(
        1,
        `${outputEvent} event was not called`
      );
    });
    it('should make a call to the UI#startGame', () => {
      const uiSpy = sinon.spy();
      userInterface.startGame = uiSpy;
      eventBus.emit(inputEvent);
      expect(uiSpy.callCount).to.equal(
        1,
        `UI method for ${inputEvent} was not called`
      );
    });
  });
});
