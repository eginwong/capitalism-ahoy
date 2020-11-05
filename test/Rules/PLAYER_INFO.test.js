const expect = require('chai').expect;
const EventEmitter = require('events');
const sinon = require('sinon');
const mockUIFactory = require('../mocks/UI');

const { GameState } = require('../../entities/GameState');
const { createPlayerFactory } = require('../testutils');
const config = require('../../config/monopolyConfiguration');
const { cloneDeep } = require('lodash');

describe('Rules -> PLAYER_INFO', () => {
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
    ];
    gameState.config = cloneDeep(config);
  });

  afterEach(() => {
    // Restore the default sandbox here
    sinon.restore();
  });

  describe('PLAYER_INFO', () => {
    const inputEvent = 'PLAYER_INFO';

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

    it(`should call UI#showPlayerTable`, () => {
      const uiSpy = sinon.spy();
      userInterface.showPlayerTable = uiSpy;
      const allProperties = gameState.config.propertyConfig.properties;
      const expectedPlayersInput = gameState.players.map((p) => ({
        ...p,
        properties: allProperties.filter((prop) => prop.ownedBy === p.id),
      }));

      eventBus.emit(inputEvent);
      expect(
        uiSpy.calledOnceWithExactly(expectedPlayersInput, allProperties)
      ).to.equal(true, `Initial UI method for ${inputEvent} was not called`);
    });
  });
});
