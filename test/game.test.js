const expect = require('chai').expect;
const EventEmitter = require('events');
const sinon = require('sinon');
const { GameState } = require('../entities/GameState');
const Rules = require('../entities/Rules');

describe('Game', () => {
  const gameState = new GameState();
  afterEach(() => {
    // Restore the default sandbox here
    sinon.restore();
  });

  it('should add event listeners to eventbus based on Rules', () => {
    const eventBus = new EventEmitter();
    const emitSpy = sinon.spy();
    eventBus.emit = emitSpy;
    require('../entities/Game')({ eventBus, userInterface: {}, gameState });
    expect(Object.keys(Rules)).to.deep.equal(
      eventBus.eventNames(),
      'Rules are not added to the event bus listeners'
    );
    for (let rule in Rules) {
      expect(Rules[rule].length).to.equal(
        eventBus.listeners(rule).length,
        `${rule} has a different number of listeners than expected`
      );
    }
  });
  it('notify the start of the game', () => {
    const eventBus = new EventEmitter();
    const emitSpy = sinon.spy();
    eventBus.emit = emitSpy;
    require('../entities/Game')({ eventBus, userInterface: {}, gameState });
    expect(emitSpy.calledOnceWithExactly('START_GAME')).to.equal(
      true,
      'Did not start game'
    );
  });
});
