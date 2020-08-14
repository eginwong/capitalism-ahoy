const expect = require('chai').expect;
const EventEmitter = require('events');
const sinon = require('sinon');
const mockUIFactory = require('../mocks/UI');

const { GameState } = require('../../entities/GameState');
const { createPlayer } = require('../testutils');
const config = require('../../config/monopolyConfiguration');
const PlayerActions = require('../../entities/PlayerActions');

describe('Rules -> RESOLVE_NEW_PROPERTY', () => {
  let gameState;
  let userInterface;
  let eventBus;
  const RULES = require('../../entities/Rules');
  const ORIENTAL_AVENUE_PROPERTY = 2;

  beforeEach(() => {
    gameState = new GameState();
    eventBus = new EventEmitter();
    userInterface = mockUIFactory();
    gameState.players = [createPlayer({ name: 'player1' })];
    gameState.config = config;
  });

  afterEach(() => {
    // Restore the default sandbox here
    sinon.restore();
  });

  describe('resolveNewProperty', () => {
    const inputEvent = 'RESOLVE_NEW_PROPERTY';
    const beginAuctionEvent = 'BEGIN_AUCTION';
    const buyPropertyEvent = 'BUY_PROPERTY';

    let beginAuctionSpy;
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
      beginAuctionSpy = sinon.spy();
      buyPropertySpy = sinon.spy();

      eventBus.on(beginAuctionEvent, beginAuctionSpy);
      eventBus.on(buyPropertyEvent, buyPropertySpy);
    });

    it('should make a call to the UI#displayPropertyDetails', () => {
      const uiSpy = sinon.spy();
      userInterface.displayPropertyDetails = uiSpy;
      const property =
        gameState.config.propertyConfig.properties[ORIENTAL_AVENUE_PROPERTY];
      gameState.currentBoardProperty = property;

      const playerActionsStub = sinon.stub(PlayerActions, 'prompt');
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
      const property =
        gameState.config.propertyConfig.properties[ORIENTAL_AVENUE_PROPERTY];
      gameState.currentBoardProperty = property;
      gameState.players[0].cash = 80;

      const playerActionsStub = sinon.stub(PlayerActions, 'prompt');

      const uiSpy = sinon.spy();
      userInterface.unknownAction = uiSpy;

      eventBus.emit(inputEvent);
      expect(beginAuctionSpy.calledOnce).to.equal(
        true,
        `${beginAuctionEvent} was not called when player did not have enough liquidity`
      );

      expect(playerActionsStub.callCount).to.equal(
        0,
        `Prompt was unexpectedly called in liquidity scenario for ${inputEvent}`
      );
    });
    it('should prompt if player can buy or auction', () => {
      const property =
        gameState.config.propertyConfig.properties[ORIENTAL_AVENUE_PROPERTY];
      gameState.currentBoardProperty = property;

      const playerActionsStub = sinon.stub(PlayerActions, 'prompt');
      playerActionsStub.returns(buyPropertyEvent);

      eventBus.emit(inputEvent);
      expect(playerActionsStub.getCall(0).args[2]).to.deep.equal(
        [buyPropertyEvent, beginAuctionEvent],
        `Prompt method for ${inputEvent} does not have expected options`
      );
    });
    it('should re-run rule if prompt input is not understood', () => {
      const property =
        gameState.config.propertyConfig.properties[ORIENTAL_AVENUE_PROPERTY];
      gameState.currentBoardProperty = property;

      const playerActionsStub = sinon.stub(PlayerActions, 'prompt');
      playerActionsStub.onCall(0).returns(undefined);
      playerActionsStub.onCall(1).returns(buyPropertyEvent);

      const uiSpy = sinon.spy();
      userInterface.unknownAction = uiSpy;

      eventBus.emit(inputEvent);
      expect(uiSpy.calledOnce).to.equal(
        true,
        `Prompt method for ${inputEvent} does not handle unknown action`
      );
    });
  });
});
