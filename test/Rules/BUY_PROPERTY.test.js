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
    const collectionsEvent = 'COLLECTIONS';
    const turnValuesUpdatedEvent = 'TURN_VALUES_UPDATED';

    let collectionsSpy;
    let turnValuesUpdatedSpy;

    beforeEach(() => {
      let { emit: notify } = eventBus;
      notify = notify.bind(eventBus);

      RULES[inputEvent].forEach((handler) =>
        eventBus.on(
          inputEvent,
          handler.bind(null, { notify, UI: userInterface }, gameState)
        )
      );
      collectionsSpy = sinon.stub();
      turnValuesUpdatedSpy = sinon.spy();

      eventBus.on(collectionsEvent, collectionsSpy);
      eventBus.on(turnValuesUpdatedEvent, turnValuesUpdatedSpy);
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
    it('should not update the ownership of the purchased asset or buy asset if player is bankrupt', () => {
      const property =
        gameState.config.propertyConfig.properties[TEST_PROPERTY];
      gameState.currentBoardProperty = property;
      const wealthServiceStub = sinon.stub(WealthService, 'buyAsset');
      gameState.currentPlayer.bankrupt = true;

      eventBus.emit(inputEvent);
      expect(property.ownedBy).not.to.equal(
        gameState.players[0].id,
        `Property ownership was updated after ${inputEvent} event even though player is in bankrupt state`
      );
      expect(wealthServiceStub.callCount).to.equal(
        0,
        `Player in bankrupt state should not have any operations occur`
      );
    });
    it(`${collectionsEvent} event sets the turn value subturn player id and charge`, () => {
      const property =
        gameState.config.propertyConfig.properties[TEST_PROPERTY];
      gameState.currentBoardProperty = property;
      gameState.currentPlayer.cash = property.price - 1;

      eventBus.emit(inputEvent);

      // tests setting the current player reference correctly
      expect(gameState.turnValues.subTurn).to.deep.equal(
        {
          playerId: gameState.currentPlayer.id,
          charge: property.price,
        },
        `${turnValuesUpdatedEvent} event has the subturn player id and charge incorrectly set`
      );
      expect(turnValuesUpdatedSpy.callCount).to.equal(
        1,
        `${turnValuesUpdatedEvent} was not called`
      );
    });
    it(`should make a call to the ${collectionsEvent} when funds are insufficient`, () => {
      const property =
        gameState.config.propertyConfig.properties[TEST_PROPERTY];
      gameState.currentBoardProperty = property;
      gameState.currentPlayer.cash = property.price - 1;

      eventBus.emit(inputEvent);

      expect(collectionsSpy.calledOnce).to.equal(
        true,
        `${collectionsEvent} event was not called when player with insufficient funds is in ${inputEvent}`
      );
    });
  });
});
