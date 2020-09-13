const expect = require('chai').expect;
const EventEmitter = require('events');
const sinon = require('sinon');
const mockUIFactory = require('../mocks/UI');

const { GameState } = require('../../entities/GameState');
const PlayerActions = require('../../entities/PlayerActions');
const { createPlayerFactory } = require('../testutils');
const config = require('../../config/monopolyConfiguration');
const { cloneDeep } = require('lodash');

describe('Rules -> LIQUIDATION', () => {
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

  describe('liquidation', () => {
    const inputEvent = 'LIQUIDATION';
    const managePropertiesEvent = 'MANAGE_PROPERTIES';
    const tradeEvent = 'TRADE';
    const bankruptcyEvent = 'BANKRUPTCY';
    const cancelEvent = 'CANCEL';

    let liquidationSpy;
    let managePropertiesSpy;
    let tradeSpy;
    let bankruptcySpy;

    beforeEach(() => {
      let { emit: notify } = eventBus;
      notify = notify.bind(eventBus);

      RULES[inputEvent].forEach((handler) =>
        eventBus.on(
          inputEvent,
          handler.bind(null, { notify, UI: userInterface }, gameState)
        )
      );
      liquidationSpy = sinon.spy();
      managePropertiesSpy = sinon.spy();
      tradeSpy = sinon.spy();
      bankruptcySpy = sinon.spy();

      eventBus.on(inputEvent, liquidationSpy);
      eventBus.on(managePropertiesEvent, managePropertiesSpy);
      eventBus.on(tradeEvent, tradeSpy);
      eventBus.on(bankruptcyEvent, bankruptcySpy);
    });

    it(`should emit desired ${managePropertiesEvent} event`, () => {
      const promptStub = sinon.stub(PlayerActions, 'prompt');
      promptStub.onCall(0).returns(managePropertiesEvent);
      promptStub.onCall(1).returns(cancelEvent);
      eventBus.emit(inputEvent);
      expect(managePropertiesSpy.callCount).to.equal(
        1,
        `${managePropertiesEvent} was called ${managePropertiesSpy.callCount} times but expected to be 1 times`
      );
    });
    it(`should emit desired ${tradeEvent} event`, () => {
      const promptStub = sinon.stub(PlayerActions, 'prompt');
      promptStub.onCall(0).returns(tradeEvent);
      promptStub.onCall(1).returns(cancelEvent);
      eventBus.emit(inputEvent);
      expect(tradeSpy.callCount).to.equal(
        1,
        `${tradeEvent} was called ${tradeSpy.callCount} times but expected to be 1 times`
      );
    });
    it(`should emit desired ${bankruptcyEvent} event`, () => {
      const promptStub = sinon.stub(PlayerActions, 'prompt');
      promptStub.onCall(0).returns(bankruptcyEvent);

      eventBus.emit(inputEvent);

      expect(bankruptcySpy.callCount).to.equal(
        1,
        `${bankruptcyEvent} was called ${bankruptcySpy.callCount} times but expected to be 1 times`
      );
    });
    it('should make a call to the UI#unknownAction if action input is not recognized', () => {
      const uiSpy = sinon.spy();
      userInterface.unknownAction = uiSpy;

      const promptStub = sinon.stub(PlayerActions, 'prompt');
      promptStub.onCall(0).returns(undefined);
      promptStub.onCall(1).returns(cancelEvent);
      eventBus.emit(inputEvent);
      expect(uiSpy.calledOnce).to.equal(
        true,
        `UI method for ${inputEvent} was not called`
      );
      expect(liquidationSpy.callCount).to.equal(
        2,
        `Unknown action did not trigger ${inputEvent} event again`
      );
    });
  });
});
