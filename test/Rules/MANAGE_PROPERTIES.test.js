const expect = require('chai').expect;
const EventEmitter = require('events');
const sinon = require('sinon');
const mockUIFactory = require('../mocks/UI');

const { GameState } = require('../../entities/GameState');
const { createPlayerFactory } = require('../testutils');
const PlayerActions = require('../../entities/PlayerActions');
const config = require('../../config/monopolyConfiguration');
const { cloneDeep } = require('lodash');

describe('Rules -> MANAGE_PROPERTIES', () => {
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

  describe('manageProperties', () => {
    const inputEvent = 'MANAGE_PROPERTIES';
    const renovateEvent = 'RENOVATE';
    const demolishEvent = 'DEMOLISH';
    const mortgageEvent = 'MORTGAGE';
    const cancelEvent = 'CANCEL';

    let managePropertySpy;
    let renovateSpy;
    let demolishSpy;
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

      managePropertySpy = sinon.spy();
      renovateSpy = sinon.spy();
      demolishSpy = sinon.spy();
      mortgageSpy = sinon.spy();

      eventBus.on(inputEvent, managePropertySpy);
      eventBus.on(renovateEvent, renovateSpy);
      eventBus.on(demolishEvent, demolishSpy);
      eventBus.on(mortgageEvent, mortgageSpy);
    });

    it(`should emit desired ${renovateEvent} event`, () => {
      const promptStub = sinon.stub(PlayerActions, 'select');
      promptStub.onCall(0).returns(renovateEvent);
      promptStub.onCall(1).returns(cancelEvent);
      eventBus.emit(inputEvent);
      expect(renovateSpy.callCount).to.equal(
        1,
        `${renovateEvent} was called ${renovateSpy.callCount} times but expected to be 1 times`
      );
    });
    it(`should emit desired ${demolishEvent} event`, () => {
      const promptStub = sinon.stub(PlayerActions, 'select');
      promptStub.onCall(0).returns(demolishEvent);
      promptStub.onCall(1).returns(cancelEvent);
      eventBus.emit(inputEvent);
      expect(demolishSpy.callCount).to.equal(
        1,
        `${demolishEvent} was called ${demolishSpy.callCount} times but expected to be 1 times`
      );
    });
    it(`should emit desired ${mortgageEvent} event`, () => {
      const promptStub = sinon.stub(PlayerActions, 'select');
      promptStub.onCall(0).returns(mortgageEvent);
      promptStub.onCall(1).returns(cancelEvent);
      eventBus.emit(inputEvent);
      expect(mortgageSpy.callCount).to.equal(
        1,
        `${mortgageEvent} was called ${mortgageSpy.callCount} times but expected to be 1 times`
      );
    });
  });
});
