const expect = require('chai').expect;
const EventEmitter = require('events');
const sinon = require('sinon');
const mockUIFactory = require('../mocks/UI');

const { GameState } = require('../../entities/GameState');
const TradeService = require('../../entities/TradeService');
const PropertyManagementService = require('../../entities/PropertyManagementService');
const WealthService = require('../../entities/WealthService');
const PlayerActions = require('../../entities/PlayerActions');
const {
  createPlayerFactory,
  getChanceCard,
  getCommunityChestCard,
  createMonopoly,
} = require('../testutils');
const config = require('../../config/monopolyConfiguration');
const { cloneDeep } = require('lodash');
const { findById } = require('../../entities/helpers');

describe('Rules -> TRADE', () => {
  let gameState;
  let userInterface;
  let eventBus;
  const RULES = require('../../entities/Rules');

  beforeEach(() => {
    gameState = new GameState();
    eventBus = new EventEmitter();
    userInterface = mockUIFactory();
    let createPlayer = createPlayerFactory();
    gameState.players = [
      createPlayer({ name: 'player1' }),
      createPlayer({ name: 'player2' }),
    ];
    gameState.config = cloneDeep(config);
  });

  afterEach(() => {
    // Restore the default sandbox here
    sinon.restore();
  });

  describe('trade', () => {
    const inputEvent = 'TRADE';
    const turnValuesUpdatedEvent = 'TURN_VALUES_UPDATED';
    const collectionsEvent = 'COLLECTIONS';

    let turnValuesUpdatedSpy;
    let collectionsStub;

    beforeEach(() => {
      let { emit: notify } = eventBus;
      notify = notify.bind(eventBus);

      RULES[inputEvent].forEach((handler) =>
        eventBus.on(
          inputEvent,
          handler.bind(null, { notify, UI: userInterface }, gameState)
        )
      );
      turnValuesUpdatedSpy = sinon.spy();
      collectionsStub = sinon.stub();

      eventBus.on(turnValuesUpdatedEvent, turnValuesUpdatedSpy);
      eventBus.on(collectionsEvent, collectionsStub);
    });

    const tradingPartnerId = 1;
    const purplePropertyGroup = 'Purple';
    let purpleProps;
    let targetPlayer;
    let sourcePlayerPrestate;
    let targetPlayerPrestate;

    beforeEach(() => {
      purpleProps = gameState.config.propertyConfig.properties.filter(
        (p) => p.group === purplePropertyGroup
      );
      targetPlayer = findById(gameState.players, tradingPartnerId);
      sourcePlayerPrestate = cloneDeep(gameState.currentPlayer);
      targetPlayerPrestate = cloneDeep(targetPlayer);
    });

    it('does not trade if prompt returns nothing', () => {
      sinon.stub(PlayerActions, 'trade').returns(undefined);

      eventBus.emit(inputEvent);

      expect(sourcePlayerPrestate).to.deep.equal(
        gameState.currentPlayer,
        `Source player state is different although trade was cancelled`
      );
      expect(targetPlayer).to.deep.equal(
        targetPlayerPrestate,
        `Target player state is different although trade was cancelled`
      );
    });
    it('exchanges cash to source player after trade', () => {
      purpleProps[0].ownedBy = gameState.currentPlayer.id;
      const cashDeal = 100;

      const tradeDetails = {
        [gameState.currentPlayer.id]: [cashDeal],
        [targetPlayer.id]: [purpleProps[0]],
        status: TradeService.TradeStatus.ACCEPT,
      };
      sinon.stub(PlayerActions, 'trade').returns(tradeDetails);

      eventBus.emit(inputEvent);

      expect(gameState.currentPlayer.cash).to.equal(
        sourcePlayerPrestate.cash + cashDeal,
        `Source player cash is same although trade occurred`
      );
      expect(targetPlayer.cash).to.equal(
        targetPlayerPrestate.cash - cashDeal,
        `Target player cash is same although trade occurred`
      );
    });
    it('exchanges cash to target player after trade', () => {
      purpleProps[0].ownedBy = tradingPartnerId;
      const cashDeal = 100;
      const tradeDetails = {
        [gameState.currentPlayer.id]: [cashDeal],
        [targetPlayer.id]: [purpleProps[0]],
        status: TradeService.TradeStatus.ACCEPT,
      };
      sinon.stub(PlayerActions, 'trade').returns(tradeDetails);

      eventBus.emit(inputEvent);

      expect(gameState.currentPlayer.cash).to.equal(
        sourcePlayerPrestate.cash + cashDeal,
        `Source player cash is same although trade occurred`
      );
      expect(targetPlayer.cash).to.equal(
        targetPlayerPrestate.cash - cashDeal,
        `Target player cash is same although trade occurred`
      );
    });
    it('does not exchange cash if no cash was in trade', () => {
      purpleProps[0].ownedBy = tradingPartnerId;
      purpleProps[1].ownedBy = gameState.currentPlayer.id;
      const tradeDetails = {
        [gameState.currentPlayer.id]: [purpleProps[1]],
        [targetPlayer.id]: [purpleProps[0]],
        status: TradeService.TradeStatus.ACCEPT,
      };
      sinon.stub(PlayerActions, 'trade').returns(tradeDetails);

      eventBus.emit(inputEvent);

      expect(gameState.currentPlayer.cash).to.equal(
        sourcePlayerPrestate.cash,
        `Source player cash is different although trade occurred without cash`
      );
      expect(targetPlayer.cash).to.equal(
        targetPlayerPrestate.cash,
        `Target player cash is different although trade occurred without cash`
      );
    });
    it('exchanges card to source player after trade', () => {
      const chanceCard = getChanceCard(gameState, 'getoutofjailfree');
      const communityChestCard = getCommunityChestCard(
        gameState,
        'getoutofjailfree'
      );
      targetPlayer.cards.push(chanceCard, communityChestCard);
      targetPlayerPrestate = cloneDeep(targetPlayer);

      const cashDeal = 100;
      const tradeDetails = {
        [gameState.currentPlayer.id]: [chanceCard, communityChestCard],
        [targetPlayer.id]: [cashDeal],
        status: TradeService.TradeStatus.ACCEPT,
      };
      sinon.stub(PlayerActions, 'trade').returns(tradeDetails);

      eventBus.emit(inputEvent);

      expect(gameState.currentPlayer.cards).to.deep.equal(
        [chanceCard, communityChestCard],
        `Source player did not receive cards`
      );
      expect(targetPlayer.cards).to.deep.equal(
        [],
        `Target player did not lose cards`
      );
    });
    it('exchanges card to target player after trade', () => {
      const chanceCard = getChanceCard(gameState, 'getoutofjailfree');
      const communityChestCard = getCommunityChestCard(
        gameState,
        'getoutofjailfree'
      );
      gameState.currentPlayer.cards.push(chanceCard, communityChestCard);
      sourcePlayerPrestate = cloneDeep(gameState.currentPlayer);

      const cashDeal = 100;
      const tradeDetails = {
        [targetPlayer.id]: [chanceCard, communityChestCard],
        [gameState.currentPlayer.id]: [cashDeal],
        status: TradeService.TradeStatus.ACCEPT,
      };
      sinon.stub(PlayerActions, 'trade').returns(tradeDetails);

      eventBus.emit(inputEvent);

      expect(gameState.currentPlayer.cards).to.deep.equal(
        [],
        `Source player did not lose cards`
      );
      expect(targetPlayer.cards).to.deep.equal(
        [chanceCard, communityChestCard],
        `Target player did not receive cards`
      );
    });
    it('update respective assets after trade', () => {
      purpleProps[0].ownedBy = tradingPartnerId;
      WealthService.buyAsset(targetPlayer, purpleProps[0].price);
      targetPlayerPrestate = cloneDeep(targetPlayer);

      const boardwalkProperty = findById(
        gameState.config.propertyConfig.properties,
        'boardwalk'
      );
      boardwalkProperty.ownedBy = gameState.currentPlayer.id;
      WealthService.buyAsset(gameState.currentPlayer, boardwalkProperty.price);
      sourcePlayerPrestate = cloneDeep(gameState.currentPlayer);

      const tradeDetails = {
        [gameState.currentPlayer.id]: [purpleProps[0]],
        [targetPlayer.id]: [boardwalkProperty],
        status: TradeService.TradeStatus.ACCEPT,
      };
      sinon.stub(PlayerActions, 'trade').returns(tradeDetails);

      eventBus.emit(inputEvent);

      expect(gameState.currentPlayer.assets).to.equal(
        sourcePlayerPrestate.assets +
          (purpleProps[0].price - boardwalkProperty.price),
        `Source player did not have its assets updated`
      );
      expect(targetPlayer.assets).to.equal(
        targetPlayerPrestate.assets +
          (boardwalkProperty.price - purpleProps[0].price),
        `Target player did not have its assets updated`
      );
      expect(purpleProps[0].ownedBy).to.equal(
        gameState.currentPlayer.id,
        `Ownership of traded asset to source was not updated`
      );
      expect(boardwalkProperty.ownedBy).to.equal(
        tradingPartnerId,
        `Ownership of traded asset to target was not updated`
      );
    });
    it('skips offer to unmortgage property if liquidity is insufficient', () => {
      createMonopoly(gameState, purplePropertyGroup, tradingPartnerId);
      const mortgageValueMultiplier =
        gameState.config.propertyConfig.mortgageValueMultiplier;
      purpleProps[1].mortgaged = true;
      WealthService.buyAsset(targetPlayer, purpleProps[0].price);
      WealthService.buyAsset(
        targetPlayer,
        purpleProps[1].price / mortgageValueMultiplier
      );
      targetPlayerPrestate = cloneDeep(targetPlayer);

      const boardwalkProperty = findById(
        gameState.config.propertyConfig.properties,
        'boardwalk'
      );
      boardwalkProperty.ownedBy = gameState.currentPlayer.id;
      WealthService.buyAsset(gameState.currentPlayer, boardwalkProperty.price);
      gameState.currentPlayer.cash = 0;
      sourcePlayerPrestate = cloneDeep(gameState.currentPlayer);

      const tradeDetails = {
        [gameState.currentPlayer.id]: [...purpleProps],
        [targetPlayer.id]: [boardwalkProperty],
        status: TradeService.TradeStatus.ACCEPT,
      };

      // stubs
      collectionsStub.callsFake(() => {
        PropertyManagementService.mortgage(gameState, purpleProps[0]);
      });
      const unmortgageStub = sinon.stub(PlayerActions, 'confirm');
      sinon.stub(PlayerActions, 'trade').returns(tradeDetails);

      eventBus.emit(inputEvent);

      expect(unmortgageStub.notCalled).to.equal(
        true,
        `Unmortgage prompt was called although player did not have requisite liquidity`
      );
    });
    it('offers to unmortgage each individual mortgaged property', () => {
      createMonopoly(gameState, purplePropertyGroup, tradingPartnerId);
      purpleProps[0].mortgaged = true;
      purpleProps[1].mortgaged = true;
      WealthService.buyAsset(targetPlayer, purpleProps[0].price);
      WealthService.buyAsset(targetPlayer, purpleProps[1].price);
      targetPlayerPrestate = cloneDeep(targetPlayer);

      const boardwalkProperty = findById(
        gameState.config.propertyConfig.properties,
        'boardwalk'
      );
      boardwalkProperty.ownedBy = gameState.currentPlayer.id;
      WealthService.buyAsset(gameState.currentPlayer, boardwalkProperty.price);
      sourcePlayerPrestate = cloneDeep(gameState.currentPlayer);

      const tradeDetails = {
        [gameState.currentPlayer.id]: [boardwalkProperty],
        [targetPlayer.id]: [...purpleProps],
        status: TradeService.TradeStatus.ACCEPT,
      };
      // stubs
      const unmortgageStub = sinon.stub(PlayerActions, 'confirm');
      unmortgageStub.onCall(0).returns(true);
      unmortgageStub.onCall(1).returns(false);
      sinon.stub(PlayerActions, 'trade').returns(tradeDetails);

      eventBus.emit(inputEvent);

      expect(unmortgageStub.callCount).to.equal(
        2,
        `Unmortgage prompt was not called expected times`
      );
      expect(purpleProps[0].mortgaged).to.equal(
        false,
        `${purpleProps[0].name} remains mortgaged even after expected unmortgaging`
      );
      expect(purpleProps[1].mortgaged).to.equal(
        true,
        `${purpleProps[1].name} is not mortgaged`
      );
    });
    it('goes to collections if player has insufficient funds to pay for interest rates', () => {
      createMonopoly(gameState, purplePropertyGroup, tradingPartnerId);
      purpleProps[1].mortgaged = true;
      WealthService.buyAsset(targetPlayer, purpleProps[0].price);
      WealthService.buyAsset(targetPlayer, purpleProps[1].price);
      targetPlayerPrestate = cloneDeep(targetPlayer);

      const boardwalkProperty = findById(
        gameState.config.propertyConfig.properties,
        'boardwalk'
      );
      boardwalkProperty.ownedBy = gameState.currentPlayer.id;
      WealthService.buyAsset(gameState.currentPlayer, boardwalkProperty.price);
      gameState.currentPlayer.cash = 0;
      sourcePlayerPrestate = cloneDeep(gameState.currentPlayer);

      const tradeDetails = {
        [gameState.currentPlayer.id]: [...purpleProps],
        [targetPlayer.id]: [boardwalkProperty],
        status: TradeService.TradeStatus.ACCEPT,
      };
      sinon.stub(PlayerActions, 'trade').returns(tradeDetails);

      eventBus.emit(inputEvent);

      expect(turnValuesUpdatedSpy.calledOnce).to.equal(
        true,
        `${turnValuesUpdatedEvent} was not called`
      );
      expect(collectionsStub.calledOnce).to.equal(
        true,
        `${collectionsEvent} was not called`
      );
    });
    it('goes to collections if player has insufficient funds to unmortgage a property', () => {
      createMonopoly(gameState, purplePropertyGroup, tradingPartnerId);
      purpleProps[1].mortgaged = true;
      WealthService.buyAsset(targetPlayer, purpleProps[0].price);
      WealthService.buyAsset(targetPlayer, purpleProps[1].price);
      targetPlayerPrestate = cloneDeep(targetPlayer);

      const boardwalkProperty = findById(
        gameState.config.propertyConfig.properties,
        'boardwalk'
      );
      boardwalkProperty.ownedBy = gameState.currentPlayer.id;
      WealthService.buyAsset(gameState.currentPlayer, boardwalkProperty.price);
      const arbitraryCashValue = 20;
      gameState.currentPlayer.cash = arbitraryCashValue;
      sourcePlayerPrestate = cloneDeep(gameState.currentPlayer);
      // stubs
      sinon.stub(PlayerActions, 'confirm').returns(true);

      const tradeDetails = {
        [gameState.currentPlayer.id]: [...purpleProps],
        [targetPlayer.id]: [boardwalkProperty],
        status: TradeService.TradeStatus.ACCEPT,
      };
      sinon.stub(PlayerActions, 'trade').returns(tradeDetails);

      eventBus.emit(inputEvent);

      expect(turnValuesUpdatedSpy.calledOnce).to.equal(
        true,
        `${turnValuesUpdatedEvent} was not called`
      );
      expect(collectionsStub.calledOnce).to.equal(
        true,
        `${collectionsEvent} was not called`
      );
    });
    it('charges player for mortgage only after all assets are traded', () => {
      createMonopoly(gameState, purplePropertyGroup, tradingPartnerId);
      purpleProps[1].mortgaged = true;
      WealthService.buyAsset(targetPlayer, purpleProps[0].price);
      WealthService.buyAsset(targetPlayer, purpleProps[1].price);
      targetPlayerPrestate = cloneDeep(targetPlayer);

      const boardwalkProperty = findById(
        gameState.config.propertyConfig.properties,
        'boardwalk'
      );
      boardwalkProperty.ownedBy = gameState.currentPlayer.id;
      WealthService.buyAsset(gameState.currentPlayer, boardwalkProperty.price);
      targetPlayer.cash = 0;
      sourcePlayerPrestate = cloneDeep(gameState.currentPlayer);
      const {
        mortgageValueMultiplier,
        interestRate,
      } = gameState.config.propertyConfig;

      const tradeDetails = {
        [gameState.currentPlayer.id]: [boardwalkProperty],
        [targetPlayer.id]: [...purpleProps],
        status: TradeService.TradeStatus.ACCEPT,
      };
      // stubs
      sinon.stub(PlayerActions, 'trade').returns(tradeDetails);
      collectionsStub.callsFake(() => {
        PropertyManagementService.mortgage(gameState, purpleProps[0]);
      });
      sinon.stub(PlayerActions, 'confirm').returns(false);

      eventBus.emit(inputEvent);

      expect(targetPlayer.bankrupt).to.equal(
        false,
        `Source player went bankrupt after trade`
      );
      expect(targetPlayer.cash).to.equal(
        purpleProps[1].price / mortgageValueMultiplier -
          (purpleProps[0].price / mortgageValueMultiplier) * interestRate,
        `Source player did not have expected cash after interest charge`
      );
    });
  });
});
