const expect = require('chai').expect;
const EventEmitter = require('events');
const sinon = require('sinon');
const mockUIFactory = require('../mocks/UI');

const { GameState } = require('../../entities/GameState');
const { createPlayerFactory, createMonopoly } = require('../testutils');
const PlayerActions = require('../../entities/PlayerActions');
const config = require('../../config/monopolyConfiguration');
const { cloneDeep } = require('lodash');

describe('Rules -> UNMORTGAGE', () => {
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
    const inputEvent = 'UNMORTGAGE';
    const cancelEvent = 'CANCEL';

    let unmortgageSpy;

    beforeEach(() => {
      let { emit: notify } = eventBus;
      notify = notify.bind(eventBus);

      RULES[inputEvent].forEach((handler) =>
        eventBus.on(
          inputEvent,
          handler.bind(null, { notify, UI: userInterface }, gameState)
        )
      );

      unmortgageSpy = sinon.spy();
      eventBus.on(inputEvent, unmortgageSpy);
    });

    it(`should emit desired ${inputEvent} event`, () => {
      const promptStub = sinon.stub(PlayerActions, 'select');
      promptStub.onCall(0).returns(cancelEvent);
      eventBus.emit(inputEvent);
      expect(unmortgageSpy.callCount).to.equal(
        1,
        `${inputEvent} was called ${unmortgageSpy.callCount} times but expected to be 1 times`
      );
    });
    it(`should call prompt with names of available mortgage properties`, () => {
      const propertyGroup = 'Purple';
      createMonopoly(gameState, propertyGroup);
      const expectedProperties = gameState.config.propertyConfig.properties.filter(
        (p) => p.group === propertyGroup
      );
      expectedProperties[0].mortgaged = true;

      const promptStub = sinon.stub(PlayerActions, 'select');
      promptStub.onCall(0).returns(cancelEvent);
      eventBus.emit(inputEvent);
      expect(promptStub.getCall(0).args[1]).to.deep.equal(
        expectedProperties
          .filter((p) => p.mortgaged)
          .map((p) => ({ display: true, value: p })),
        `Unexpected prompt input for unmortgage properties list: ${
          promptStub.getCall(0).args[2]
        }`
      );
    });
    it(`should unmortgage property returned from the prompt if output is a valid property`, () => {
      const propertyGroup = 'Purple';
      createMonopoly(gameState, propertyGroup);
      const expectedProperty = gameState.config.propertyConfig.properties.find(
        (p) => p.group === propertyGroup
      );
      expectedProperty.mortgaged = true;
      const originalMortgageState = expectedProperty.mortgaged;

      const promptStub = sinon.stub(PlayerActions, 'select');
      promptStub.onCall(0).returns(expectedProperty);
      promptStub.onCall(1).returns(cancelEvent);
      eventBus.emit(inputEvent);
      expect(expectedProperty.mortgaged).to.equal(
        !originalMortgageState,
        `${inputEvent} was called with valid property and was still mortgaged`
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

      const promptStub = sinon.stub(PlayerActions, 'select');
      promptStub.onCall(0).returns(expectedProperty);
      promptStub.onCall(1).returns(cancelEvent);

      eventBus.emit(inputEvent);

      expect(expectedProperty.mortgaged).to.equal(
        originalMortgageState,
        `${inputEvent} was called with valid property without sufficient funds and mortgage was toggled`
      );
      expect(uiSpy.calledOnceWithExactly(gameState.currentPlayer)).to.equal(
        true,
        `UI method for ${inputEvent} was not called although player has insufficient funds`
      );
    });
  });
});
