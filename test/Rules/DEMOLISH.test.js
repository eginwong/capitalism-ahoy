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

describe('Rules -> DEMOLISH', () => {
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

  describe('demolish', () => {
    const inputEvent = 'DEMOLISH';
    const cancelEvent = 'CANCEL';

    let demolishSpy;

    beforeEach(() => {
      let { emit: notify } = eventBus;
      notify = notify.bind(eventBus);

      RULES[inputEvent].forEach((handler) =>
        eventBus.on(
          inputEvent,
          handler.bind(null, { notify, UI: userInterface }, gameState)
        )
      );

      demolishSpy = sinon.spy();
      eventBus.on(inputEvent, demolishSpy);
    });

    it(`should emit desired ${inputEvent} event`, () => {
      const promptStub = sinon.stub(PlayerActions, 'select');
      promptStub.onCall(0).returns(cancelEvent);
      eventBus.emit(inputEvent);
      expect(demolishSpy.callCount).to.equal(
        1,
        `${inputEvent} was called ${demolishSpy.callCount} times but expected to be 1 times`
      );
    });
    it(`should call prompt with names of available demo properties`, () => {
      const testPropertyName = 'testProperty';
      const propMgmtServiceStub = sinon.stub(
        PropertyManagementService,
        'getDemoProperties'
      );
      propMgmtServiceStub.onCall(0).returns([{ name: testPropertyName }]);
      const promptStub = sinon.stub(PlayerActions, 'select');
      promptStub.onCall(0).returns(cancelEvent);
      eventBus.emit(inputEvent);
      expect(promptStub.getCall(0).args[1]).to.deep.equal(
        [testPropertyName],
        `Unexpected prompt input for demo properties list: ${
          promptStub.getCall(0).args[1]
        }`
      );
    });
    it(`should demolish property returned from the prompt if output is a valid property`, () => {
      const testProperty = { name: 'testProperty' };
      const getdemoStub = sinon.stub(
        PropertyManagementService,
        'getDemoProperties'
      );
      getdemoStub.returns([testProperty]);
      const demolishStub = sinon.stub(PropertyManagementService, 'demolish');
      const promptStub = sinon.stub(PlayerActions, 'select');
      promptStub.onCall(0).returns(testProperty.name);
      promptStub.onCall(1).returns(cancelEvent);
      eventBus.emit(inputEvent);
      expect(demolishStub.callCount).to.equal(
        1,
        `${inputEvent} was called with valid property and demolish method was called ${demolishStub.callCount} times but expected to be 1 times`
      );
    });
  });
});
