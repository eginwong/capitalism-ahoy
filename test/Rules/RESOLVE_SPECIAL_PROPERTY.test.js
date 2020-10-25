const expect = require('chai').expect;
const EventEmitter = require('events');
const sinon = require('sinon');
const mockUIFactory = require('../mocks/UI');

const { GameState } = require('../../entities/GameState');
const WealthService = require('../../entities/WealthService');
const { createPlayerFactory } = require('../testutils');
const config = require('../../config/monopolyConfiguration');
const { cloneDeep } = require('lodash');

describe('Rules -> RESOLVE_SPECIAL_PROPERTY', () => {
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
    gameState.config = cloneDeep(config);
  });

  afterEach(() => {
    // Restore the default sandbox here
    sinon.restore();
  });

  describe('resolveSpecialProperty', () => {
    const inputEvent = 'RESOLVE_SPECIAL_PROPERTY';
    const jailEvent = 'JAIL';
    const incomeTaxEvent = 'INCOME_TAX';
    const chanceEvent = 'CHANCE';
    const communityChestEvent = 'COMMUNITY_CHEST';
    const collectionsEvent = 'COLLECTIONS';
    const turnValuesUpdatedEvent = 'TURN_VALUES_UPDATED';

    let jailSpy;
    let incomeTaxSpy;
    let chanceSpy;
    let communityChestSpy;
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
      jailSpy = sinon.spy();
      incomeTaxSpy = sinon.spy();
      chanceSpy = sinon.spy();
      communityChestSpy = sinon.spy();
      collectionsSpy = sinon.stub();
      turnValuesUpdatedSpy = sinon.spy();

      eventBus.on(jailEvent, jailSpy);
      eventBus.on(incomeTaxEvent, incomeTaxSpy);
      eventBus.on(chanceEvent, chanceSpy);
      eventBus.on(communityChestEvent, communityChestSpy);
      eventBus.on(collectionsEvent, collectionsSpy);
      eventBus.on(turnValuesUpdatedEvent, turnValuesUpdatedSpy);
    });

    it(`should emit ${jailEvent} event if special property is go to jail`, () => {
      const property = gameState.config.propertyConfig.properties.find(
        (p) => p.id === 'gotojail'
      );
      gameState.currentBoardProperty = property;

      eventBus.emit(inputEvent);

      expect(jailSpy.calledOnce).to.equal(
        true,
        `Go to Jail property did not emit ${jailEvent}`
      );
    });
    it(`should emit ${chanceEvent} event if special property is chance`, () => {
      const property = gameState.config.propertyConfig.properties.find(
        (p) => p.id === 'chance1'
      );
      gameState.currentBoardProperty = property;

      eventBus.emit(inputEvent);

      expect(chanceSpy.calledOnce).to.equal(
        true,
        `Chance property did not emit ${chanceEvent}`
      );
    });
    it(`should emit ${communityChestEvent} event if special property is communityChest`, () => {
      const property = gameState.config.propertyConfig.properties.find(
        (p) => p.id === 'communitychest1'
      );
      gameState.currentBoardProperty = property;

      eventBus.emit(inputEvent);

      expect(communityChestSpy.calledOnce).to.equal(
        true,
        `Community Chest property did not emit ${communityChestEvent}`
      );
    });
    it(`should emit ${incomeTaxEvent} event if special property is income tax`, () => {
      const incomeTaxProperty = gameState.config.propertyConfig.properties.find(
        (p) => p.id === 'incometax'
      );
      gameState.currentBoardProperty = incomeTaxProperty;

      eventBus.emit(inputEvent);

      expect(incomeTaxSpy.calledOnce).to.equal(
        true,
        `Income Tax property did not emit ${incomeTaxEvent}`
      );
    });
    it(`should decrement luxury tax if special property is luxury tax`, () => {
      const luxuryTaxProperty = gameState.config.propertyConfig.properties.find(
        (p) => p.id === 'luxurytax'
      );
      gameState.currentBoardProperty = luxuryTaxProperty;
      const originalCash = gameState.currentPlayer.cash;

      eventBus.emit(inputEvent);

      expect(gameState.currentPlayer.cash).to.equal(
        originalCash - gameState.config.luxuryTaxAmount,
        `Luxury Tax property did not decrement ${gameState.config.luxuryTaxAmount} from player's cash`
      );
    });
    it('should make a call to the UI#luxuryTaxPaid', () => {
      const luxuryTaxProperty = gameState.config.propertyConfig.properties.find(
        (p) => p.id === 'luxurytax'
      );
      gameState.currentBoardProperty = luxuryTaxProperty;
      const uiSpy = sinon.spy();
      userInterface.luxuryTaxPaid = uiSpy;

      eventBus.emit(inputEvent);
      expect(
        uiSpy.calledOnceWithExactly(gameState.config.luxuryTaxAmount)
      ).to.equal(
        true,
        `UI method for ${inputEvent} to display fee was not called`
      );
    });
    it(`${collectionsEvent} event sets the turn value subturn player and charge`, () => {
      const luxuryTaxProperty = gameState.config.propertyConfig.properties.find(
        (p) => p.id === 'luxurytax'
      );
      gameState.currentBoardProperty = luxuryTaxProperty;
      gameState.currentPlayer.cash = 0;
      eventBus.emit(inputEvent);

      expect(gameState.turnValues.subTurn).to.deep.equal(
        {
          playerId: gameState.currentPlayer.id,
          charge: gameState.config.luxuryTaxAmount,
        },
        `${turnValuesUpdatedEvent} event has the subturn player id and charge incorrectly set`
      );
      expect(turnValuesUpdatedSpy.callCount).to.equal(
        1,
        `${turnValuesUpdatedEvent} was not called`
      );
    });
    it(`${collectionsEvent} event should be called if current player has no more cash to pay the fine`, () => {
      const luxuryTaxProperty = gameState.config.propertyConfig.properties.find(
        (p) => p.id === 'luxurytax'
      );
      gameState.currentBoardProperty = luxuryTaxProperty;
      gameState.currentPlayer.cash = 0;
      eventBus.emit(inputEvent);

      expect(collectionsSpy.callCount).to.equal(
        1,
        `${collectionsEvent} was not called`
      );
    });
    it('should not decrement luxury tax if player is bankrupt', () => {
      const luxuryTaxProperty = gameState.config.propertyConfig.properties.find(
        (p) => p.id === 'luxurytax'
      );
      gameState.currentBoardProperty = luxuryTaxProperty;
      gameState.currentPlayer.cash = 0;
      const wealthServiceStub = sinon.stub(WealthService, 'buyAsset');
      gameState.currentPlayer.bankrupt = true;

      eventBus.emit(inputEvent);
      expect(wealthServiceStub.callCount).to.equal(
        0,
        `Player in bankrupt state should not have any operations occur`
      );
    });
  });
});
