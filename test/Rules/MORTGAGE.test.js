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
      const promptStub = sinon.stub(PlayerActions, 'select');
      promptStub.onCall(0).returns(cancelEvent);
      eventBus.emit(inputEvent);
      expect(mortgageSpy.callCount).to.equal(
        1,
        `${inputEvent} was called ${mortgageSpy.callCount} times but expected to be 1 times`
      );
    });
    it(`should call prompt with names of available mortgage properties`, () => {
      const propertyGroup = 'Purple';
      createMonopoly(gameState, propertyGroup);
      const expectedProperties = gameState.config.propertyConfig.properties.filter(
        (p) => p.group === propertyGroup
      );

      const promptStub = sinon.stub(PlayerActions, 'select');
      promptStub.onCall(0).returns(cancelEvent);
      eventBus.emit(inputEvent);
      expect(promptStub.getCall(0).args[2]).to.deep.equal(
        [...expectedProperties.map((p) => p.name.toUpperCase()), 'CANCEL'],
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

      const promptStub = sinon.stub(PlayerActions, 'select');
      promptStub.onCall(0).returns(expectedProperty.name.toUpperCase());
      promptStub.onCall(1).returns(cancelEvent);
      eventBus.emit(inputEvent);
      expect(expectedProperty.mortgaged).to.equal(
        !originalMortgageState,
        `${inputEvent} was called with valid property and mortgage was not toggled`
      );
    });
  });
});
