const expect = require('chai').expect;
const EventEmitter = require('events');
const sinon = require('sinon');
const mockUIFactory = require('../mocks/UI');

const { GameState } = require('../../entities/GameState');
const { createPlayerFactory, createMonopoly } = require('../testutils');
const config = require('../../config/monopolyConfiguration.json');
const { cloneDeep } = require('lodash');
const {
  findById,
  findByPosition,
  findByGroup,
} = require('../../entities/helpers');

describe('Rules -> PAY_RENT', () => {
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

  describe('payRent', () => {
    const inputEvent = 'PAY_RENT';
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
      gameState.turnValues = {
        roll: [1, 2],
        speedingCounter: 0,
      };
      collectionsSpy = sinon.stub();
      turnValuesUpdatedSpy = sinon.spy();

      eventBus.on(collectionsEvent, collectionsSpy);
      eventBus.on(turnValuesUpdatedEvent, turnValuesUpdatedSpy);
    });

    it('should make a call to the UI#payingRent', () => {
      const ownerId = 1;
      const owner = findById(gameState.players, ownerId);
      const testProperty = findById(
        gameState.config.propertyConfig.properties,
        'balticave'
      );
      testProperty.ownedBy = ownerId;
      gameState.currentBoardProperty = testProperty;

      const uiSpy = sinon.spy();
      userInterface.payingRent = uiSpy;
      eventBus.emit(inputEvent);
      expect(
        uiSpy.calledOnceWithExactly(
          gameState.currentPlayer,
          owner,
          testProperty.rent
        ),
        `Initial UI method for ${inputEvent} was not called`
      );
    });
    it(`should exchange rent cost between current player and owner`, () => {
      const ownerId = 1;
      const owner = findById(gameState.players, ownerId);
      const testProperty = findById(
        gameState.config.propertyConfig.properties,
        'balticave'
      );
      testProperty.ownedBy = ownerId;
      gameState.currentBoardProperty = testProperty;
      const startingOwnerCash = owner.cash;
      const startingPlayerCash = gameState.currentPlayer.cash;

      eventBus.emit(inputEvent);
      expect(owner.cash).to.equal(
        startingOwnerCash + testProperty.rent,
        "Owner's cash amount incorrectly incremented in rent exchange"
      );
      expect(gameState.currentPlayer.cash).to.equal(
        startingPlayerCash - testProperty.rent,
        "Player's cash amount incorrectly decremented in rent exchange"
      );
    });
    it(`should exchange rent cost between current player and owner when ids are not ordered`, () => {
      const ownerId = 0;
      // invert player ids
      gameState.players.find((p) => p.name === 'player1').id = 1;
      gameState.players.find((p) => p.name === 'player2').id = 0;
      const owner = findById(gameState.players, ownerId);
      const testProperty = findById(
        gameState.config.propertyConfig.properties,
        'balticave'
      );
      testProperty.ownedBy = ownerId;
      gameState.currentBoardProperty = testProperty;
      const startingOwnerCash = owner.cash;
      const startingPlayerCash = gameState.currentPlayer.cash;

      eventBus.emit(inputEvent);
      expect(owner.cash).to.equal(
        startingOwnerCash + testProperty.rent,
        "Owner's cash amount incorrectly incremented in rent exchange"
      );
      expect(gameState.currentPlayer.cash).to.equal(
        startingPlayerCash - testProperty.rent,
        "Player's cash amount incorrectly decremented in rent exchange"
      );
    });
    it(`should exchange only what rent cost is available when current player is about to be bankrupt`, () => {
      const ownerId = 1;
      const owner = findById(gameState.players, ownerId);
      const testProperty = findById(
        gameState.config.propertyConfig.properties,
        'balticave'
      );
      testProperty.ownedBy = ownerId;
      gameState.currentBoardProperty = testProperty;
      const startingOwnerCash = owner.cash;
      const startingPlayerCash = 3;
      gameState.currentPlayer.cash = startingPlayerCash;

      eventBus.emit(inputEvent);
      expect(owner.cash).to.equal(
        startingOwnerCash + startingPlayerCash,
        "Owner's cash amount incorrectly incremented in rent exchange when limited funds"
      );
      expect(gameState.currentPlayer.cash).to.equal(
        0,
        "Player's cash amount incorrectly decremented in rent exchange with limited funds"
      );
    });
    it(`${collectionsEvent} event sets the turn value subturn player id and charge`, () => {
      const ownerId = 1;
      const testProperty = findById(
        gameState.config.propertyConfig.properties,
        'balticave'
      );
      testProperty.ownedBy = ownerId;
      gameState.currentBoardProperty = testProperty;
      const startingPlayerCash = 3;
      gameState.currentPlayer.cash = startingPlayerCash;
      eventBus.emit(inputEvent);

      expect(gameState.turnValues.subTurn).to.deep.equal(
        {
          playerId: gameState.currentPlayer.id,
          charge: testProperty.rent,
        },
        `${turnValuesUpdatedEvent} event has the subturn player id and charge incorrectly set`
      );
      expect(turnValuesUpdatedSpy.callCount).to.equal(
        1,
        `${turnValuesUpdatedEvent} was not called`
      );
    });
    it(`${collectionsEvent} event should be called if current player has no more cash to pay the fine`, () => {
      const ownerId = 1;
      const testProperty = findById(
        gameState.config.propertyConfig.properties,
        'balticave'
      );
      testProperty.ownedBy = ownerId;
      gameState.currentBoardProperty = testProperty;
      const startingPlayerCash = 3;
      gameState.currentPlayer.cash = startingPlayerCash;
      eventBus.emit(inputEvent);

      expect(collectionsSpy.callCount).to.equal(
        1,
        `${collectionsEvent} was not called`
      );
    });

    describe('common properties', () => {
      it(`should charge rent based on buildings if built on the property`, () => {
        const ownerId = 1;
        const owner = findById(gameState.players, ownerId);
        const testProperty = findById(
          gameState.config.propertyConfig.properties,
          'balticave'
        );
        testProperty.ownedBy = ownerId;
        testProperty.buildings = 3;
        gameState.currentBoardProperty = testProperty;
        const startingOwnerCash = owner.cash;
        const startingPlayerCash = gameState.currentPlayer.cash;

        eventBus.emit(inputEvent);
        expect(owner.cash).to.equal(
          startingOwnerCash +
            testProperty.multipliedRent[testProperty.buildings - 1],
          "Owner's cash amount incorrectly incremented in rent exchange"
        );
        expect(gameState.currentPlayer.cash).to.equal(
          startingPlayerCash -
            testProperty.multipliedRent[testProperty.buildings - 1],
          "Player's cash amount incorrectly decremented in rent exchange"
        );
      });
      it(`should charge monopoly if all properties owned in group and no buildings are built`, () => {
        const ownerId = 1;
        const owner = findById(gameState.players, ownerId);
        const testProperty = findById(
          gameState.config.propertyConfig.properties,
          'balticave'
        );
        testProperty.ownedBy = ownerId;
        gameState.currentBoardProperty = testProperty;
        createMonopoly(gameState, testProperty.group, ownerId);
        const startingOwnerCash = owner.cash;
        const startingPlayerCash = gameState.currentPlayer.cash;

        eventBus.emit(inputEvent);
        expect(owner.cash).to.equal(
          startingOwnerCash + testProperty.rent * 2,
          "Owner's cash amount incorrectly incremented in rent exchange"
        );
        expect(gameState.currentPlayer.cash).to.equal(
          startingPlayerCash - testProperty.rent * 2,
          "Player's cash amount incorrectly decremented in rent exchange"
        );
      });
    });
    describe('railroads', () => {
      it(`should charge based on railroads owned`, () => {
        const ownerId = 1;
        const owner = findById(gameState.players, ownerId);
        const testProperty = findByGroup(
          gameState.config.propertyConfig.properties,
          'Railroad'
        );
        testProperty.ownedBy = ownerId;
        gameState.currentBoardProperty = testProperty;
        createMonopoly(gameState, testProperty.group, ownerId);
        const startingOwnerCash = owner.cash;
        const startingPlayerCash = gameState.currentPlayer.cash;
        const railroadPricing = [25, 50, 100, 200];

        eventBus.emit(inputEvent);
        expect(owner.cash).to.equal(
          startingOwnerCash + railroadPricing[3],
          "Owner's cash amount incorrectly incremented in rent exchange"
        );
        expect(gameState.currentPlayer.cash).to.equal(
          startingPlayerCash - railroadPricing[3],
          "Player's cash amount incorrectly decremented in rent exchange"
        );
      });
    });
    describe('utilities', () => {
      it(`should charge based on roll`, () => {
        const ownerId = 1;
        const owner = findById(gameState.players, ownerId);
        const testProperty = findByGroup(
          gameState.config.propertyConfig.properties,
          'Utilities'
        );
        testProperty.ownedBy = ownerId;
        gameState.currentBoardProperty = testProperty;
        const startingOwnerCash = owner.cash;
        const startingPlayerCash = gameState.currentPlayer.cash;
        const totalRoll =
          gameState.turnValues.roll[0] + gameState.turnValues.roll[1];

        eventBus.emit(inputEvent);
        expect(owner.cash).to.equal(
          startingOwnerCash + totalRoll * 4,
          "Owner's cash amount incorrectly incremented in rent exchange"
        );
        expect(gameState.currentPlayer.cash).to.equal(
          startingPlayerCash - totalRoll * 4,
          "Player's cash amount incorrectly decremented in rent exchange"
        );
      });
      it(`should charge 10x multiplier for both utilities owned`, () => {
        const ownerId = 1;
        const owner = findById(gameState.players, ownerId);
        const testProperty = findByPosition(
          gameState.config.propertyConfig.properties,
          12
        );
        testProperty.ownedBy = ownerId;
        gameState.currentBoardProperty = testProperty;
        createMonopoly(gameState, testProperty.group, ownerId);
        const startingOwnerCash = owner.cash;
        const startingPlayerCash = gameState.currentPlayer.cash;
        const totalRoll =
          gameState.turnValues.roll[0] + gameState.turnValues.roll[1];

        eventBus.emit(inputEvent);
        expect(owner.cash).to.equal(
          startingOwnerCash + totalRoll * 10,
          "Owner's cash amount incorrectly incremented in rent exchange"
        );
        expect(gameState.currentPlayer.cash).to.equal(
          startingPlayerCash - totalRoll * 10,
          "Player's cash amount incorrectly decremented in rent exchange"
        );
      });
    });
  });
});
