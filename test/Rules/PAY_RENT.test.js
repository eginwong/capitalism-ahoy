const expect = require('chai').expect;
const EventEmitter = require('events');
const sinon = require('sinon');
const mockUIFactory = require('../mocks/UI');

const { GameState } = require('../../entities/GameState');
const { createPlayerFactory, createMonopoly } = require('../testutils');
const config = require('../../config/monopolyConfiguration.json');
const { cloneDeep } = require('lodash');

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
    });

    it('should make a call to the UI#payingRent', () => {
      const ownerId = 1;
      const owner = gameState.players.find((p) => p.id === ownerId);
      const testProperty = gameState.config.propertyConfig.properties.find(
        (p) => p.position === 3
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
      const owner = gameState.players.find((p) => p.id === ownerId);
      const testProperty = gameState.config.propertyConfig.properties.find(
        (p) => p.position === 3
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
    describe('common properties', () => {
      it(`should charge rent based on buildings if built on the property`, () => {
        const ownerId = 1;
        const owner = gameState.players.find((p) => p.id === ownerId);
        const testProperty = gameState.config.propertyConfig.properties.find(
          (p) => p.position === 3
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
        const owner = gameState.players.find((p) => p.id === ownerId);
        const testProperty = gameState.config.propertyConfig.properties.find(
          (p) => p.position === 3
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
        const owner = gameState.players.find((p) => p.id === ownerId);
        const testProperty = gameState.config.propertyConfig.properties.find(
          (p) => p.group === 'Railroad'
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
        const owner = gameState.players.find((p) => p.id === ownerId);
        const testProperty = gameState.config.propertyConfig.properties.find(
          (p) => p.group === 'Utilities'
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
        const owner = gameState.players.find((p) => p.id === ownerId);
        const testProperty = gameState.config.propertyConfig.properties.find(
          (p) => p.position === 12
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
