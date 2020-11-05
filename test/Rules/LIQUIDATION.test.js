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
    const playerInfoEvent = 'PLAYER_INFO';
    const cancelEvent = 'CANCEL';

    let liquidationSpy;
    let managePropertiesSpy;
    let tradeSpy;
    let playerInfoSpy;

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
      playerInfoSpy = sinon.spy();

      eventBus.on(inputEvent, liquidationSpy);
      eventBus.on(managePropertiesEvent, managePropertiesSpy);
      eventBus.on(tradeEvent, tradeSpy);
      eventBus.on(playerInfoEvent, playerInfoSpy);
    });

    it(`should emit desired ${managePropertiesEvent} event`, () => {
      const promptStub = sinon.stub(PlayerActions, 'select');
      promptStub.onCall(0).returns(managePropertiesEvent);
      promptStub.onCall(1).returns(cancelEvent);
      eventBus.emit(inputEvent);
      expect(managePropertiesSpy.callCount).to.equal(
        1,
        `${managePropertiesEvent} was called ${managePropertiesSpy.callCount} times but expected to be 1 times`
      );
    });
    it(`should emit desired ${tradeEvent} event`, () => {
      const promptStub = sinon.stub(PlayerActions, 'select');
      promptStub.onCall(0).returns(tradeEvent);
      promptStub.onCall(1).returns(cancelEvent);
      eventBus.emit(inputEvent);
      expect(tradeSpy.callCount).to.equal(
        1,
        `${tradeEvent} was called ${tradeSpy.callCount} times but expected to be 1 times`
      );
    });
    it(`should emit desired ${playerInfoEvent} event`, () => {
      const promptStub = sinon.stub(PlayerActions, 'select');
      promptStub.onCall(0).returns(playerInfoEvent);
      promptStub.onCall(1).returns(cancelEvent);
      eventBus.emit(inputEvent);
      expect(playerInfoSpy.callCount).to.equal(
        1,
        `${playerInfoEvent} was called ${playerInfoSpy.callCount} times but expected to be 1 times`
      );
    });
  });
});
