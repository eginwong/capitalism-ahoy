const expect = require('chai').expect;
const EventEmitter = require('events');
const sinon = require('sinon');
const mockUIFactory = require('../mocks/UI');

const { GameState } = require('../../entities/GameState');
const { createPlayerFactory } = require('../testutils');
const config = require('../../config/monopolyConfiguration');
const WealthService = require('../../entities/WealthService');
const { cloneDeep } = require('lodash');

describe('Rules -> BUY_PROPERTY', () => {
  let gameState;
  let userInterface;
  let eventBus;
  const RULES = require('../../entities/Rules');
  const TEST_PROPERTY = 2;

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

  describe('buyProperty', () => {
    const inputEvent = 'BUY_PROPERTY';

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

    it('should make a call to the UI#propertyBought', () => {
      const uiSpy = sinon.spy();
      userInterface.propertyBought = uiSpy;
      eventBus.emit(inputEvent);
      expect(uiSpy.calledOnce).to.equal(
        true,
        `Initial UI method for ${inputEvent} was not called`
      );
    });
    it('should buy asset and adjust player stats', () => {
      const property =
        gameState.config.propertyConfig.properties[TEST_PROPERTY];
      gameState.currentBoardProperty = property;

      const wealthServiceStub = sinon.stub(WealthService, 'buyAsset');

      eventBus.emit(inputEvent);
      expect(
        wealthServiceStub.calledOnceWithExactly(
          gameState.players[0],
          property.price
        ),
        `Player wealth was not updated after ${inputEvent} event`
      );
    });
    it('should update the ownership of the purchased asset', () => {
      const property =
        gameState.config.propertyConfig.properties[TEST_PROPERTY];
      gameState.currentBoardProperty = property;

      eventBus.emit(inputEvent);
      expect(property.ownedBy).to.equal(
        gameState.players[0].id,
        `Property ownership was not updated after ${inputEvent} event`
      );
    });
  });
});
