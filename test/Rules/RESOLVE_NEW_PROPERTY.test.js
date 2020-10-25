const expect = require('chai').expect;
const EventEmitter = require('events');
const sinon = require('sinon');
const mockUIFactory = require('../mocks/UI');

const { GameState } = require('../../entities/GameState');
const { createPlayerFactory } = require('../testutils');
const config = require('../../config/monopolyConfiguration');
const PlayerActions = require('../../entities/PlayerActions');
const { cloneDeep } = require('lodash');

describe('Rules -> RESOLVE_NEW_PROPERTY', () => {
  let gameState;
  let userInterface;
  let eventBus;
  const RULES = require('../../entities/Rules');
  const TEST_PROPERTY = 2;

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

  describe('resolveNewProperty', () => {
    const inputEvent = 'RESOLVE_NEW_PROPERTY';
    const auctionEvent = 'AUCTION';
    const buyPropertyEvent = 'BUY_PROPERTY';

    let auctionSpy;
    let buyPropertySpy;

    beforeEach(() => {
      let { emit: notify } = eventBus;
      notify = notify.bind(eventBus);

      RULES[inputEvent].forEach((handler) =>
        eventBus.on(
          inputEvent,
          handler.bind(null, { notify, UI: userInterface }, gameState)
        )
      );
      auctionSpy = sinon.spy();
      buyPropertySpy = sinon.spy();

      eventBus.on(auctionEvent, auctionSpy);
      eventBus.on(buyPropertyEvent, buyPropertySpy);
    });

    it('should make a call to the UI#displayPropertyDetails', () => {
      const uiSpy = sinon.spy();
      userInterface.displayPropertyDetails = uiSpy;
      const property = config.propertyConfig.properties[TEST_PROPERTY];
      gameState.currentBoardProperty = property;

      const playerActionsStub = sinon.stub(PlayerActions, 'select');
      playerActionsStub.returns(buyPropertyEvent);

      eventBus.emit(inputEvent);
      expect(
        uiSpy.calledOnceWithExactly(
          property,
          `Initial UI method for ${inputEvent} was not called`
        )
      );
    });
    it('should automatically begin auction if player does not have enough liquidity', () => {
      const property = config.propertyConfig.properties[TEST_PROPERTY];
      gameState.currentBoardProperty = property;
      gameState.players[0].cash = 80;

      const playerActionsStub = sinon.stub(PlayerActions, 'select');

      eventBus.emit(inputEvent);
      expect(auctionSpy.calledOnce).to.equal(
        true,
        `${auctionEvent} was not called when player did not have enough liquidity`
      );

      expect(playerActionsStub.callCount).to.equal(
        0,
        `Prompt was unexpectedly called in liquidity scenario for ${inputEvent}`
      );
    });
    it('should prompt if player can buy or auction', () => {
      const property = config.propertyConfig.properties[TEST_PROPERTY];
      gameState.currentBoardProperty = property;

      const playerActionsStub = sinon.stub(PlayerActions, 'select');
      playerActionsStub.returns(buyPropertyEvent);

      eventBus.emit(inputEvent);
      expect(playerActionsStub.getCall(0).args[2]).to.deep.equal(
        [buyPropertyEvent, auctionEvent],
        `Prompt method for ${inputEvent} does not have expected options`
      );
    });
  });
});
