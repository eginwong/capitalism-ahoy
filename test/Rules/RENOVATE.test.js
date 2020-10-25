const expect = require('chai').expect;
const EventEmitter = require('events');
const sinon = require('sinon');
const mockUIFactory = require('../mocks/UI');

const { GameState } = require('../../entities/GameState');
const { createPlayerFactory } = require('../testutils');
const PlayerActions = require('../../entities/PlayerActions');
const PropertyManagementService = require('../../entities/PropertyManagementService');
const config = require('../../config/monopolyConfiguration');
const { cloneDeep } = require('lodash');

describe('Rules -> RENOVATE', () => {
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

  describe('renovate', () => {
    const inputEvent = 'RENOVATE';
    const cancelEvent = 'CANCEL';

    let renovateSpy;

    beforeEach(() => {
      let { emit: notify } = eventBus;
      notify = notify.bind(eventBus);

      RULES[inputEvent].forEach((handler) =>
        eventBus.on(
          inputEvent,
          handler.bind(null, { notify, UI: userInterface }, gameState)
        )
      );

      renovateSpy = sinon.spy();
      eventBus.on(inputEvent, renovateSpy);
    });

    it(`should emit desired ${inputEvent} event`, () => {
      const promptStub = sinon.stub(PlayerActions, 'select');
      promptStub.onCall(0).returns(cancelEvent);
      eventBus.emit(inputEvent);
      expect(renovateSpy.callCount).to.equal(
        1,
        `${inputEvent} was called ${renovateSpy.callCount} times but expected to be 1 times`
      );
    });
    it(`should call prompt with names of available reno properties`, () => {
      const testPropertyName = 'testProperty';
      const propMgmtServiceStub = sinon.stub(
        PropertyManagementService,
        'getRenoProperties'
      );
      propMgmtServiceStub.onCall(0).returns([{ name: testPropertyName }]);
      const promptStub = sinon.stub(PlayerActions, 'select');
      promptStub.onCall(0).returns(cancelEvent);
      eventBus.emit(inputEvent);
      expect(promptStub.getCall(0).args[2]).to.deep.equal(
        [testPropertyName, 'CANCEL'],
        `Unexpected prompt input for reno properties list: ${
          promptStub.getCall(0).args[2]
        }`
      );
    });
    it(`should renovate property returned from the prompt if output is a valid property`, () => {
      const testProperty = { name: 'testProperty' };
      const getRenoStub = sinon.stub(
        PropertyManagementService,
        'getRenoProperties'
      );
      getRenoStub.returns([testProperty]);
      const renovateStub = sinon.stub(PropertyManagementService, 'renovate');
      const promptStub = sinon.stub(PlayerActions, 'select');
      promptStub.onCall(0).returns(testProperty.name);
      promptStub.onCall(1).returns(cancelEvent);
      eventBus.emit(inputEvent);
      expect(renovateStub.callCount).to.equal(
        1,
        `${inputEvent} was called with valid property and renovate method was called ${renovateStub.callCount} times but expected to be 1 times`
      );
    });
  });
});
