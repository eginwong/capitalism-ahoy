const expect = require('chai').expect;
const EventEmitter = require('events');
const sinon = require('sinon');
const mockUIFactory = require('../mocks/UI');

const { GameState } = require('../../entities/GameState');
const { createPlayerFactory } = require('../testutils');
const config = require('../../config/monopolyConfiguration');
const { findById } = require('../../entities/helpers');

describe('Rules -> JAIL', () => {
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
    gameState.config = config;
  });

  afterEach(() => {
    // Restore the default sandbox here
    sinon.restore();
  });

  describe('jail', () => {
    const inputEvent = 'JAIL';

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
      const jailPosition = findById(
        gameState.config.propertyConfig.properties,
        'jail'
      ).position;
      expect(gameState.currentPlayer.position).to.equal(
        jailPosition,
        'Current player is not in jail'
      );
    });
  });
});
