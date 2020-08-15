const expect = require('chai').expect;
const EventEmitter = require('events');
const sinon = require('sinon');
const mockUIFactory = require('../mocks/UI');

const { GameState } = require('../../entities/GameState');
const { createPlayerFactory } = require('../testutils');

describe('Rules -> END_TURN', () => {
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

  describe('endTurn', () => {
    const inputEvent = 'END_TURN';
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
    it(`should increment the turn counter`, () => {
      const before = gameState.turn;
      eventBus.emit(inputEvent);
      const after = gameState.turn;

      expect(after - before).to.equal(1, 'Turn counter was not incremented');
    });
    it('should make a call to the UI#endTurn', () => {
      const uiSpy = sinon.spy();
      userInterface.endTurn = uiSpy;
      eventBus.emit(inputEvent);
      expect(uiSpy.callCount).to.equal(
        1,
        `UI method for ${inputEvent} was not called`
      );
    });
  });
});
