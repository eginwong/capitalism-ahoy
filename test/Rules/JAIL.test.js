const expect = require('chai').expect;
const EventEmitter = require('events');
const sinon = require('sinon');
const mockUIFactory = require('../mocks/UI');

const { GameState } = require('../../entities/GameState');
const { createPlayer } = require('../testutils');
const config = require('../../config/monopolyConfiguration');

describe('Rules -> JAIL', () => {
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

  describe('jail', () => {
    const inputEvent = 'JAIL';
    let endTurnEvent = 'END_TURN';
    let endTurnSpy;

    beforeEach(() => {
      let { emit: notify } = eventBus;
      notify = notify.bind(eventBus);

      RULES[inputEvent].forEach((handler) =>
        eventBus.on(
          inputEvent,
          handler.bind(null, { notify, UI: userInterface }, gameState)
        )
      );
      endTurnSpy = sinon.spy();
      eventBus.on(endTurnEvent, endTurnSpy);
    });

    it('should make a call to the UI#jail', () => {
      const uiSpy = sinon.spy();
      userInterface.jail = uiSpy;
      eventBus.emit(inputEvent);
      expect(uiSpy.calledOnce).to.equal(
        true,
        `Initial UI method for ${inputEvent} was not called`
      );
    });
    it('should set jailed counter', () => {
      eventBus.emit(inputEvent);
      expect(gameState.currentPlayer.jailed).to.equal(
        0,
        'Jail counter was not set to 0'
      );
    });
    it("should update player's position to jail", () => {
      eventBus.emit(inputEvent);
      const jailPosition = gameState.config.propertyConfig.properties.find(
        (p) => p.id === 'jail'
      ).position;
      expect(gameState.currentPlayer.position).to.equal(
        jailPosition,
        'Current player is not in jail'
      );
    });
    it(`the ${endTurnEvent} event should be called`, () => {
      eventBus.emit(inputEvent);
      expect(endTurnSpy.callCount).to.equal(
        1,
        `${endTurnEvent} was not called`
      );
    });
  });
});
