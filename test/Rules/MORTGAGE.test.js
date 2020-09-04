const expect = require('chai').expect;
const EventEmitter = require('events');
const sinon = require('sinon');
const mockUIFactory = require('../mocks/UI');

const { GameState } = require('../../entities/GameState');
const { createPlayerFactory, createMonopoly } = require('../testutils');
const PlayerActions = require('../../entities/PlayerActions');
const config = require('../../config/monopolyConfiguration');
const { cloneDeep } = require('lodash');

describe('Rules -> MORTGAGE', () => {
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

  describe('mortgage', () => {
    const inputEvent = 'MORTGAGE';
    const cancelEvent = 'CANCEL';

    let mortgageSpy;

    beforeEach(() => {
      let { emit: notify } = eventBus;
      notify = notify.bind(eventBus);

      RULES[inputEvent].forEach((handler) =>
        eventBus.on(
          inputEvent,
          handler.bind(null, { notify, UI: userInterface }, gameState)
        )
      );

      mortgageSpy = sinon.spy();
      eventBus.on(inputEvent, mortgageSpy);
    });

    it(`should emit desired ${inputEvent} event`, () => {
      const promptStub = sinon.stub(PlayerActions, 'prompt');
      promptStub.onCall(0).returns(false);
      promptStub.onCall(1).returns(cancelEvent);
      eventBus.emit(inputEvent);
      expect(mortgageSpy.callCount).to.equal(
        2,
        `${inputEvent} was called ${mortgageSpy.callCount} times but expected to be 1 times`
      );
    });
    it(`should call prompt with names of available mortgage properties`, () => {
      const propertyGroup = 'Purple';
      createMonopoly(gameState, propertyGroup);
      const expectedProperties = gameState.config.propertyConfig.properties.filter(
        (p) => p.group === propertyGroup
      );

      const promptStub = sinon.stub(PlayerActions, 'prompt');
      promptStub.onCall(0).returns(cancelEvent);
      eventBus.emit(inputEvent);
      expect(promptStub.getCall(0).args[2]).to.deep.equal(
        [...expectedProperties.map((p) => p.name), 'CANCEL'],
        `Unexpected prompt input for mortgage properties list: ${
          promptStub.getCall(0).args[2]
        }`
      );
    });
    it(`should not call prompt with names of properties that have constructed buildings`, () => {
      const propertyGroup = 'Purple';
      createMonopoly(gameState, propertyGroup);
      const expectedProperties = gameState.config.propertyConfig.properties.filter(
        (p) => p.group === propertyGroup
      );
      expectedProperties.forEach((p) => {
        p.buildings = 1;
      });

      const promptStub = sinon.stub(PlayerActions, 'prompt');
      promptStub.onCall(0).returns(cancelEvent);
      eventBus.emit(inputEvent);
      expect(promptStub.getCall(0).args[2]).to.deep.equal(
        ['CANCEL'],
        `Unexpected prompt input for mortgage properties list: ${
          promptStub.getCall(0).args[2]
        }`
      );
    });
    it(`should not call prompt with names of properties that do not belong to the player`, () => {
      const ownerId = 1;
      const propertyGroup = 'Purple';
      createMonopoly(gameState, propertyGroup, ownerId);

      const promptStub = sinon.stub(PlayerActions, 'prompt');
      promptStub.onCall(0).returns(cancelEvent);
      eventBus.emit(inputEvent);
      expect(promptStub.getCall(0).args[2]).to.deep.equal(
        ['CANCEL'],
        `Unexpected prompt input for mortgage properties list: ${
          promptStub.getCall(0).args[2]
        }`
      );
    });
    it(`should toggle mortgage property returned from the prompt if output is a valid property`, () => {
      const propertyGroup = 'Purple';
      createMonopoly(gameState, propertyGroup);
      const expectedProperty = gameState.config.propertyConfig.properties.find(
        (p) => p.group === propertyGroup
      );
      const originalMortgageState = expectedProperty.mortgaged;

      const promptStub = sinon.stub(PlayerActions, 'prompt');
      promptStub.onCall(0).returns(expectedProperty.name);
      promptStub.onCall(1).returns(cancelEvent);
      eventBus.emit(inputEvent);
      expect(expectedProperty.mortgaged).to.equal(
        !originalMortgageState,
        `${inputEvent} was called with valid property and mortgage was not toggled`
      );
    });
    it(`should not toggle mortgage property returned from the prompt if cash on hand is insufficient for unmortgage + interest rate`, () => {
      const uiSpy = sinon.spy();
      userInterface.noCashMustLiquidate = uiSpy;

      gameState.currentPlayer.cash = 32; // unmortgage would cost 30 + 10% = 33
      const propertyGroup = 'Purple';
      createMonopoly(gameState, propertyGroup);
      const expectedProperty = gameState.config.propertyConfig.properties.find(
        (p) => p.group === propertyGroup
      );
      expectedProperty.mortgaged = true;
      const originalMortgageState = expectedProperty.mortgaged;

      const promptStub = sinon.stub(PlayerActions, 'prompt');
      promptStub.onCall(0).returns(expectedProperty.name);
      promptStub.onCall(1).returns(cancelEvent);
      eventBus.emit(inputEvent);
      expect(expectedProperty.mortgaged).to.equal(
        originalMortgageState,
        `${inputEvent} was called with valid property without sufficient funds and mortgage was toggled`
      );
      expect(uiSpy.calledOnce).to.equal(
        true,
        `UI method for ${inputEvent} was not called although player has insufficient funds`
      );
    });
    it('should make a call to the UI#unknownAction if action input is not recognized', () => {
      const uiSpy = sinon.spy();
      userInterface.unknownAction = uiSpy;

      const promptStub = sinon.stub(PlayerActions, 'prompt');
      promptStub.onCall(0).returns(false);
      promptStub.onCall(1).returns(cancelEvent);
      eventBus.emit(inputEvent);
      expect(uiSpy.calledOnce).to.equal(
        true,
        `UI method for ${inputEvent} was not called`
      );
    });
  });
});
