const expect = require('chai').expect;
const sinon = require('sinon');
const mockUIFactory = require('./mocks/UI');

const { GameState } = require('../entities/GameState');
const {
  createPlayerFactory,
  createMonopoly,
  getCommunityChestCard,
  getChanceCard,
} = require('./testutils');
const TradeService = require('../entities/TradeService');
const PropertyManagementService = require('../entities/PropertyManagementService');
const config = require('../config/monopolyConfiguration');
const { cloneDeep } = require('lodash');
const { findById, findByGroup } = require('../entities/helpers');

describe('TradeService', () => {
  let gameState;
  let userInterface;

  beforeEach(() => {
    gameState = new GameState();
    userInterface = mockUIFactory();
    let createPlayer = createPlayerFactory();
    gameState.players = [
      createPlayer({ name: 'player1' }),
      createPlayer({ name: 'player2' }),
      createPlayer({ name: 'player3' }),
    ];
    // simulate start of a turn
    require('../entities/Rules/resetTurnAssociatedValues')({
      speedingCounter: 0,
    })(gameState);
    gameState.config = cloneDeep(config);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('trade', () => {
    it('should display all eligible players information', () => {
      const showPlayerTradeTableUISpy = sinon.spy();
      userInterface.showPlayerTradeTable = showPlayerTradeTableUISpy;
      gameState.players[2].bankrupt = true;
      const eligiblePlayerCount = gameState.players.filter(
        (p) => p.id !== gameState.currentPlayer.id && !p.bankrupt
      ).length;
      sinon.stub(userInterface, 'promptSelect').returns(-1);

      TradeService.trade(userInterface, gameState);
      expect(showPlayerTradeTableUISpy.calledOnce).to.equal(
        true,
        `UI#showPlayerTradeTable was not called`
      );
      expect(showPlayerTradeTableUISpy.getCall(0).args.length).to.equal(
        eligiblePlayerCount,
        `UI#showPlayerTradeTable was not called with correct number of player arguments`
      );
    });
    it('should allow player to select another player to trade with', () => {
      const tradingPartner = gameState.players[2];
      const promptSelectStub = sinon.stub(userInterface, 'promptSelect');
      const determineTradeAssetsStub = sinon.stub(
        TradeService,
        'determineTradeAssets'
      );
      promptSelectStub.onCall(0).returns(0);
      promptSelectStub.onCall(1).returns(1);
      determineTradeAssetsStub.onCall(0).returns({
        status: TradeService.TradeStatus.CANCEL,
      });
      determineTradeAssetsStub.onCall(1).returns({
        status: TradeService.TradeStatus.ACCEPT,
      });

      expect(
        TradeService.trade(userInterface, gameState)[tradingPartner.id]
      ).to.deep.equal([], 'target trading player id property was not returned');
    });
    it('should allow player to cancel trade with another player', () => {
      const promptSelectStub = sinon.stub(userInterface, 'promptSelect');
      const determineTradeAssetsStub = sinon.stub(
        TradeService,
        'determineTradeAssets'
      );
      promptSelectStub.onCall(0).returns(0);
      promptSelectStub.onCall(1).returns(-1);
      determineTradeAssetsStub.onCall(0).returns({
        status: TradeService.TradeStatus.CANCEL,
      });

      expect(TradeService.trade(userInterface, gameState)).to.equal(
        undefined,
        'player cancelled trade action and did not return undefined'
      );
      expect(promptSelectStub.callCount).to.equal(
        2,
        'player was given the player select prompt more than expected'
      );
    });
    it('should allow player to leave trade action completely', () => {
      const promptSelectStub = sinon.stub(userInterface, 'promptSelect');
      promptSelectStub.returns(-1);

      expect(TradeService.trade(userInterface, gameState)).to.equal(
        undefined,
        'player cancelled trade action and did not return undefined'
      );
    });
    it('should return trade details if changes are accepted', () => {
      const tradingPartner = gameState.players[1];
      const propertyGroup = 'Purple';
      createMonopoly(gameState, propertyGroup, tradingPartner.id);
      const expectedTradeProp = findByGroup(
        gameState.config.propertyConfig.properties,
        propertyGroup
      );
      const promptSelectStub = sinon.stub(userInterface, 'promptSelect');
      const determineTradeAssetsStub = sinon.stub(
        TradeService,
        'determineTradeAssets'
      );
      promptSelectStub.returns(0);
      const mockOffer = {
        [tradingPartner.id]: [100],
        [gameState.currentPlayer.id]: [expectedTradeProp],
        status: TradeService.TradeStatus.OFFER,
      };
      determineTradeAssetsStub.onCall(0).returns(mockOffer);
      determineTradeAssetsStub.onCall(1).returns({
        status: TradeService.TradeStatus.ACCEPT,
      });

      expect(TradeService.trade(userInterface, gameState)).to.deep.equal(
        {
          ...mockOffer,
          status: TradeService.TradeStatus.ACCEPT,
        },
        `Trade Details were not as expected after trading partner accepts offer`
      );
    });
    describe('pass to other player', () => {
      it('sets trade details status to OFFER if changes are made to the trade details', () => {
        const tradingPartner = gameState.players[1];
        const propertyGroup = 'Purple';
        createMonopoly(gameState, propertyGroup, tradingPartner.id);
        const expectedTradeProp = findByGroup(
          gameState.config.propertyConfig.properties,
          propertyGroup
        );
        const promptSelectStub = sinon.stub(userInterface, 'promptSelect');
        const determineTradeAssetsStub = sinon.stub(
          TradeService,
          'determineTradeAssets'
        );
        promptSelectStub.onCall(0).returns(0);
        determineTradeAssetsStub.onCall(0).returns({
          [tradingPartner.id]: [100],
          [gameState.currentPlayer.id]: [expectedTradeProp],
          status: TradeService.TradeStatus.OFFER,
        });
        determineTradeAssetsStub.onCall(1).returns({
          [tradingPartner.id]: [200],
          [gameState.currentPlayer.id]: [expectedTradeProp],
          status: TradeService.TradeStatus.OFFER,
        });
        determineTradeAssetsStub.onCall(2).returns({
          status: TradeService.TradeStatus.ACCEPT,
        });

        TradeService.trade(userInterface, gameState);

        expect(determineTradeAssetsStub.callCount).to.equal(
          3,
          `stub was not called expected times when expecting counter offers`
        );
      });
      it('returns control to previous player if CANCEL', () => {
        const tradingPartner = gameState.players[1];
        const propertyGroup = 'Purple';
        createMonopoly(gameState, propertyGroup, tradingPartner.id);
        const expectedTradeProp = findByGroup(
          gameState.config.propertyConfig.properties,
          propertyGroup
        );
        const promptSelectStub = sinon.stub(userInterface, 'promptSelect');
        const determineTradeAssetsStub = sinon.stub(
          TradeService,
          'determineTradeAssets'
        );
        promptSelectStub.onCall(0).returns(0);
        promptSelectStub.onCall(1).returns(-1);
        determineTradeAssetsStub.onCall(0).returns({
          [tradingPartner.id]: [100],
          [gameState.currentPlayer.id]: [expectedTradeProp],
          status: TradeService.TradeStatus.OFFER,
        });
        determineTradeAssetsStub.onCall(1).returns({
          [tradingPartner.id]: [100],
          [gameState.currentPlayer.id]: [expectedTradeProp],
          status: TradeService.TradeStatus.CANCEL,
        });
        determineTradeAssetsStub.onCall(2).returns({
          [tradingPartner.id]: [100],
          [gameState.currentPlayer.id]: [expectedTradeProp],
          status: TradeService.TradeStatus.CANCEL,
        });

        TradeService.trade(userInterface, gameState);

        expect(determineTradeAssetsStub.callCount).to.equal(
          3,
          `stub was not called expected times when expecting cancellations`
        );
      });
      it('returns control to previous player if changes are made to the trade details and accepted', () => {
        const tradingPartner = gameState.players[1];
        const propertyGroup = 'Purple';
        createMonopoly(gameState, propertyGroup, tradingPartner.id);
        const expectedTradeProp = findByGroup(
          gameState.config.propertyConfig.properties,
          propertyGroup
        );
        const promptSelectStub = sinon.stub(userInterface, 'promptSelect');
        const determineTradeAssetsStub = sinon.stub(
          TradeService,
          'determineTradeAssets'
        );
        promptSelectStub.returns(0);
        const mockOffer = {
          [tradingPartner.id]: [100],
          [gameState.currentPlayer.id]: [expectedTradeProp],
          status: TradeService.TradeStatus.OFFER,
        };
        determineTradeAssetsStub.onCall(0).returns(mockOffer);
        determineTradeAssetsStub.onCall(1).returns({
          ...mockOffer,
          [tradingPartner.id]: [200],
        });
        determineTradeAssetsStub.onCall(2).returns({
          status: TradeService.TradeStatus.ACCEPT,
        });

        expect(TradeService.trade(userInterface, gameState)).to.deep.equal(
          {
            ...mockOffer,
            [tradingPartner.id]: [200],
            [gameState.currentPlayer.id]: [expectedTradeProp],
            status: TradeService.TradeStatus.ACCEPT,
          },
          `Trade Details were not as expected after trading partner counter offers and player accepts offer`
        );
      });
    });
  });

  describe('determineTradeAssets', () => {
    it('calls prompt for user to enter values and returns trade details', () => {
      const promptCLLoopUISpy = sinon.spy();
      userInterface.promptCLLoop = promptCLLoopUISpy;

      const tradingPartnerId = 1;
      const players = gameState.players.map((p) => {
        const {
          tradeableProps,
          untradeableProps,
        } = PropertyManagementService.getPlayerPropertiesForTrade(gameState, p);
        return {
          ...p,
          tradeableProps,
          untradeableProps,
        };
      });

      const sourcePlayer = findById(players, gameState.currentPlayer.id);
      const tradingPartner = findById(players, tradingPartnerId);
      const tradeDetails = {
        tradingPlayerId: tradingPartnerId,
        [gameState.currentPlayer.id]: [],
        [tradingPartner.id]: [],
        status: TradeService.TradeStatus.NEW,
      };

      const resultTradeDetails = TradeService.determineTradeAssets(
        userInterface,
        gameState,
        sourcePlayer,
        tradingPartner,
        tradeDetails
      );

      expect(resultTradeDetails).to.deep.equal(
        tradeDetails,
        `Trade details were modified although no actions were taken`
      );

      expect(promptCLLoopUISpy.calledOnce).to.equal(
        true,
        `Trade prompt did not fire`
      );
    });
  });

  describe('determineTradeAssets internals', () => {
    it(`ACTION: 'help'`, () => {
      const tradeInstructionsUISpy = sinon.spy();
      userInterface.tradeInstructions = tradeInstructionsUISpy;
      TradeService.help(userInterface);

      expect(tradeInstructionsUISpy.calledOnce).equal(
        true,
        `UI#tradeInstructions was not called when calling 'help'`
      );
    });
    it(`ACTION: 'info'`, () => {
      const players = gameState.players.map((p) => {
        const {
          tradeableProps,
          untradeableProps,
        } = PropertyManagementService.getPlayerPropertiesForTrade(gameState, p);
        return {
          ...p,
          tradeableProps,
          untradeableProps,
        };
      });
      const sourcePlayer = findById(players, gameState.currentPlayer.id);
      const tradingPartnerId = 1;
      const tradingPartner = findById(players, tradingPartnerId);
      const propertyGroup = 'Purple';
      createMonopoly(gameState, propertyGroup, tradingPartnerId);
      const tradeDetails = {
        tradingPlayerId: tradingPartnerId,
        [tradingPartner.id]: [],
        [gameState.currentPlayer.id]: [],
        status: TradeService.TradeStatus.NEW,
      };
      const showPlayerTradeTableUISpy = sinon.spy();
      userInterface.showPlayerTradeTable = showPlayerTradeTableUISpy;

      const displayTradeDetailsUISpy = sinon.spy();
      userInterface.displayTradeDetails = displayTradeDetailsUISpy;

      TradeService.info(
        userInterface,
        gameState.currentPlayer.id,
        sourcePlayer,
        tradingPartner,
        tradeDetails
      );

      expect(
        showPlayerTradeTableUISpy.calledOnceWithExactly([
          sourcePlayer,
          tradingPartner,
        ])
      ).deep.equal(
        true,
        `UI#showPlayerTradeTable was not called when calling 'info'`
      );
      expect(
        displayTradeDetailsUISpy.calledOnceWithExactly(
          gameState.currentPlayer.id,
          sourcePlayer,
          tradingPartner,
          tradeDetails
        )
      ).deep.equal(
        true,
        `UI#displayTradeDetails was not called when calling 'info'`
      );
    });
    it(`ACTION: 'cancel'`, () => {
      const tradingPartnerId = 1;
      const tradeDetails = {
        tradingPlayerId: tradingPartnerId,
        [tradingPartnerId]: [],
        [gameState.currentPlayer.id]: [],
        status: TradeService.TradeStatus.NEW,
      };

      expect(TradeService.cancel(tradeDetails)).to.equal(
        true,
        `output of 'cancel' action was not true`
      );
      expect(tradeDetails.status).to.equal(
        TradeService.TradeStatus.CANCEL,
        `'cancel' action did not update the trade details status`
      );
    });
    describe('ACTION: request', () => {
      const tradingPartnerId = 1;
      const propertyGroup = 'Purple';
      let purpleProps;
      let players;
      let sourcePlayer;
      let tradingPartner;

      beforeEach(() => {
        createMonopoly(gameState, propertyGroup, tradingPartnerId);
        purpleProps = gameState.config.propertyConfig.properties.filter(
          (p) => p.group === propertyGroup
        );
        players = gameState.players.map((p) => {
          const {
            tradeableProps,
            untradeableProps,
          } = PropertyManagementService.getPlayerPropertiesForTrade(
            gameState,
            p
          );
          return {
            ...p,
            tradeableProps,
            untradeableProps,
          };
        });
        sourcePlayer = findById(players, gameState.currentPlayer.id);
        tradingPartner = findById(players, tradingPartnerId);
      });

      it(`allows player to 'request' target player assets`, () => {
        const tradeDetails = {
          [gameState.currentPlayer.id]: [],
          [tradingPartner.id]: [],
          status: TradeService.TradeStatus.NEW,
        };
        const tempTradeDetails = cloneDeep(tradeDetails);
        const promptSelectStub = sinon.stub(userInterface, 'promptSelect');
        promptSelectStub.onCall(0).returns(0); // purple property #1
        promptSelectStub.onCall(1).returns(-1); // cancel

        TradeService.request(
          userInterface,
          sourcePlayer,
          tradingPartner,
          tradeDetails,
          tempTradeDetails
        );

        expect(tempTradeDetails.status).to.equal(
          TradeService.TradeStatus.NEW,
          `Did not return NEW status when assets were modified in the trade`
        );
        expect(tempTradeDetails).to.deep.equal(
          {
            ...tradeDetails,
            [gameState.currentPlayer.id]: [purpleProps[0]],
          },
          `Did not return updated trade details to include requested asset`
        );
      });
      it(`allows player to 'request' target player's card`, () => {
        const tradeDetails = {
          [gameState.currentPlayer.id]: [],
          [tradingPartner.id]: [],
          status: TradeService.TradeStatus.NEW,
        };
        const tempTradeDetails = cloneDeep(tradeDetails);
        const promptSelectStub = sinon.stub(userInterface, 'promptSelect');
        promptSelectStub.onCall(0).returns(0); // purple property #1
        promptSelectStub.onCall(1).returns(-1); // cancel

        TradeService.request(
          userInterface,
          sourcePlayer,
          tradingPartner,
          tradeDetails,
          tempTradeDetails
        );

        expect(tempTradeDetails.status).to.equal(
          TradeService.TradeStatus.NEW,
          `Did not return NEW status when assets were modified in the trade`
        );
        expect(tempTradeDetails).to.deep.equal(
          {
            ...tradeDetails,
            [gameState.currentPlayer.id]: [purpleProps[0]],
          },
          `Did not return updated trade details to include requested asset`
        );
      });
      it(`allows player to 'request' and remove target player assets`, () => {
        const tradeDetails = {
          tradingPlayerId: tradingPartnerId,
          [gameState.currentPlayer.id]: [],
          [tradingPartner.id]: [],
          status: TradeService.TradeStatus.NEW,
        };
        const tempTradeDetails = cloneDeep(tradeDetails);
        const promptSelectStub = sinon.stub(userInterface, 'promptSelect');
        promptSelectStub.onCall(0).returns(0); // purple property #1
        promptSelectStub.onCall(1).returns(0); // purple property #1
        promptSelectStub.onCall(2).returns(-1); // cancel

        TradeService.request(
          userInterface,
          sourcePlayer,
          tradingPartner,
          tradeDetails,
          tempTradeDetails
        );

        expect(tempTradeDetails).to.deep.equal(
          tradeDetails,
          `Trade details included removed asset`
        );
      });
      it(`allows player to 'request' target player cash`, () => {
        const tradeDetails = {
          tradingPlayerId: tradingPartnerId,
          [gameState.currentPlayer.id]: [],
          [tradingPartner.id]: [],
          status: TradeService.TradeStatus.NEW,
        };
        const tempTradeDetails = cloneDeep(tradeDetails);
        const promptSelectStub = sinon.stub(userInterface, 'promptSelect');
        promptSelectStub.onCall(0).returns(purpleProps.length); // cash
        promptSelectStub.onCall(1).returns(-1); // cancel

        const arbitraryCashAmount = 1;
        const promptNumberStub = sinon.stub(userInterface, 'promptNumber');
        promptNumberStub.onCall(0).returns(0);
        promptNumberStub.onCall(1).returns(tradingPartner.cash + 1);
        promptNumberStub.onCall(2).returns(arbitraryCashAmount);

        TradeService.request(
          userInterface,
          sourcePlayer,
          tradingPartner,
          tradeDetails,
          tempTradeDetails
        );

        expect(tempTradeDetails).to.deep.equal(
          {
            ...tradeDetails,
            [gameState.currentPlayer.id]: [arbitraryCashAmount],
          },
          `Did not include cash in trade details`
        );
        expect(promptNumberStub.callCount).to.equal(
          3,
          `Did not prompt cash amount n times to account for validation scenarios`
        );
      });
      it(`allows player to 'request' and remove target player cash`, () => {
        const tradeDetails = {
          tradingPlayerId: tradingPartnerId,
          [gameState.currentPlayer.id]: [],
          [tradingPartner.id]: [],
          status: TradeService.TradeStatus.NEW,
        };
        const tempTradeDetails = cloneDeep(tradeDetails);
        const promptSelectStub = sinon.stub(userInterface, 'promptSelect');
        promptSelectStub.onCall(0).returns(purpleProps.length); // cash
        promptSelectStub.onCall(1).returns(purpleProps.length); // cash
        promptSelectStub.onCall(2).returns(-1); // cancel

        const arbitraryCashAmount = 1;
        const promptNumberStub = sinon.stub(userInterface, 'promptNumber');
        promptNumberStub.returns(arbitraryCashAmount);

        TradeService.request(
          userInterface,
          sourcePlayer,
          tradingPartner,
          tradeDetails,
          tempTradeDetails
        );

        expect(tempTradeDetails).to.deep.equal(
          tradeDetails,
          `Includes cash in trade details even after removing it`
        );
      });
      it(`does not change trade details status if assets are not modified`, () => {
        const tradeDetails = {
          tradingPlayerId: tradingPartnerId,
          [tradingPartner.id]: [purpleProps[0]],
          [gameState.currentPlayer.id]: [100],
          status: TradeService.TradeStatus.OFFER,
        };
        const tempTradeDetails = cloneDeep(tradeDetails);
        const promptSelectStub = sinon.stub(userInterface, 'promptSelect');
        promptSelectStub.onCall(0).returns(0); // purple property #1
        promptSelectStub.onCall(1).returns(0); // purple property #1
        promptSelectStub.onCall(2).returns(-1); // cancel

        TradeService.request(
          userInterface,
          sourcePlayer,
          tradingPartner,
          tradeDetails,
          tempTradeDetails
        );

        expect(tempTradeDetails).to.deep.equal(
          tradeDetails,
          `Trade details changed although no actual changes occurred`
        );
      });
      it(`changes trade details status to NEW if assets are modified`, () => {
        const tradeDetails = {
          tradingPlayerId: tradingPartnerId,
          [gameState.currentPlayer.id]: [purpleProps[0]],
          [tradingPartner.id]: [100],
          status: TradeService.TradeStatus.OFFER,
        };
        const tempTradeDetails = cloneDeep(tradeDetails);
        const promptSelectStub = sinon.stub(userInterface, 'promptSelect');
        promptSelectStub.onCall(0).returns(1); // purple property #2
        promptSelectStub.onCall(1).returns(-1); // cancel

        TradeService.request(
          userInterface,
          sourcePlayer,
          tradingPartner,
          tradeDetails,
          tempTradeDetails
        );

        expect(tempTradeDetails).to.deep.equal(
          {
            ...tradeDetails,
            [gameState.currentPlayer.id]: [...purpleProps],
            status: TradeService.TradeStatus.NEW,
          },
          `Did not return NEW status when 'request' changed trade details`
        );
      });
      it(`changes trade assets when source player is the trading player`, () => {
        const tradeDetails = {
          [gameState.currentPlayer.id]: [],
          [tradingPartner.id]: [],
          status: TradeService.TradeStatus.NEW,
        };
        const tempTradeDetails = cloneDeep(tradeDetails);
        const promptSelectStub = sinon.stub(userInterface, 'promptSelect');
        promptSelectStub.onCall(0).returns(0); // cash
        promptSelectStub.onCall(1).returns(-1); // cancel

        const arbitraryCashAmount = 1;
        const promptNumberStub = sinon.stub(userInterface, 'promptNumber');
        promptNumberStub.onCall(0).returns(arbitraryCashAmount);

        TradeService.request(
          userInterface,
          tradingPartner,
          sourcePlayer,
          tradeDetails,
          tempTradeDetails
        );

        expect(tempTradeDetails).to.deep.equal(
          {
            ...tradeDetails,
            [tradingPartner.id]: [arbitraryCashAmount],
          },
          `Did not correctly swap context for 'offer'`
        );
      });
      it(`correctly restores previous trade details to 'request' selections`, () => {
        const communityChestCard = getCommunityChestCard(
          gameState,
          'getoutofjailfree'
        );
        const chanceCard = getChanceCard(gameState, 'getoutofjailfree');
        tradingPartner.cards = [communityChestCard, chanceCard];

        const tradeDetails = {
          tradingPlayerId: tradingPartnerId,
          [tradingPartner.id]: [],
          [gameState.currentPlayer.id]: [
            purpleProps[0],
            communityChestCard,
            chanceCard,
            300,
          ],
          status: TradeService.TradeStatus.OFFER,
        };
        const tempTradeDetails = cloneDeep(tradeDetails);
        const promptSelectStub = sinon.stub(userInterface, 'promptSelect');
        promptSelectStub.onCall(0).returns(0); // prop #1
        promptSelectStub.onCall(1).returns(purpleProps.length); // community chest card
        promptSelectStub.onCall(2).returns(purpleProps.length + 1); // chance card
        promptSelectStub.onCall(3).returns(purpleProps.length + 2); // cash
        promptSelectStub.onCall(4).returns(-1); // cancel

        TradeService.request(
          userInterface,
          sourcePlayer,
          tradingPartner,
          tradeDetails,
          tempTradeDetails
        );

        expect(tempTradeDetails).to.deep.equal(
          {
            ...tradeDetails,
            [gameState.currentPlayer.id]: [],
            status: TradeService.TradeStatus.NEW,
          },
          `Did not remove assets from [gameState.currentPlayer.id] as expected`
        );
      });
    });
    it('CONSTRAINTS: removes OFFER cash if cash is added in REQUEST', () => {
      const tradingPartnerId = 1;
      const propertyGroup = 'Purple';
      createMonopoly(gameState, propertyGroup, tradingPartnerId);
      const purpleProps = gameState.config.propertyConfig.properties.filter(
        (p) => p.group === propertyGroup
      );

      const players = gameState.players.map((p) => {
        const {
          tradeableProps,
          untradeableProps,
        } = PropertyManagementService.getPlayerPropertiesForTrade(gameState, p);
        return {
          ...p,
          tradeableProps,
          untradeableProps,
        };
      });
      const sourcePlayer = findById(players, gameState.currentPlayer.id);
      const tradingPartner = findById(players, tradingPartnerId);
      const tradeDetails = {
        [gameState.currentPlayer.id]: [],
        [tradingPartner.id]: [100],
        status: TradeService.TradeStatus.OFFER,
      };
      const tempTradeDetails = cloneDeep(tradeDetails);
      const promptSelectStub = sinon.stub(userInterface, 'promptSelect');
      promptSelectStub.onCall(0).returns(purpleProps.length); // cash
      promptSelectStub.onCall(1).returns(-1); // cancel

      const arbitraryCashAmount = 1;
      const promptNumberStub = sinon.stub(userInterface, 'promptNumber');
      promptNumberStub.returns(arbitraryCashAmount);

      TradeService.request(
        userInterface,
        sourcePlayer,
        tradingPartner,
        tradeDetails,
        tempTradeDetails
      );

      expect(tempTradeDetails).to.deep.equal(
        {
          ...tradeDetails,
          [gameState.currentPlayer.id]: [arbitraryCashAmount],
          [tradingPartner.id]: [],
          status: TradeService.TradeStatus.NEW,
        },
        `Did not clear cash in the offer in trade details`
      );
    });
    it('CONSTRAINTS: removes REQUEST cash if cash is added in OFFER', () => {
      const tradingPartnerId = 1;
      const propertyGroup = 'Purple';
      createMonopoly(gameState, propertyGroup, tradingPartnerId);

      const players = gameState.players.map((p) => {
        const {
          tradeableProps,
          untradeableProps,
        } = PropertyManagementService.getPlayerPropertiesForTrade(gameState, p);
        return {
          ...p,
          tradeableProps,
          untradeableProps,
        };
      });
      const sourcePlayer = findById(players, gameState.currentPlayer.id);
      const tradingPartner = findById(players, tradingPartnerId);
      const tradeDetails = {
        [gameState.currentPlayer.id]: [100],
        [tradingPartner.id]: [],
        status: TradeService.TradeStatus.OFFER,
      };
      const tempTradeDetails = cloneDeep(tradeDetails);
      const promptSelectStub = sinon.stub(userInterface, 'promptSelect');
      promptSelectStub.onCall(0).returns(0); // cash
      promptSelectStub.onCall(1).returns(-1); // cancel

      const arbitraryCashAmount = 1;
      const promptNumberStub = sinon.stub(userInterface, 'promptNumber');
      promptNumberStub.returns(arbitraryCashAmount);

      TradeService.request(
        userInterface,
        tradingPartner,
        sourcePlayer,
        tradeDetails,
        tempTradeDetails
      );

      expect(tempTradeDetails).to.deep.equal(
        {
          ...tradeDetails,
          [gameState.currentPlayer.id]: [],
          [tradingPartner.id]: [arbitraryCashAmount],
          status: TradeService.TradeStatus.NEW,
        },
        `Did not clear cash in the request in trade details`
      );
    });
    it('CONSTRAINTS: cancel and restoring cash does not change status', () => {
      const tradingPartnerId = 1;
      const propertyGroup = 'Purple';
      createMonopoly(gameState, propertyGroup, tradingPartnerId);

      const players = gameState.players.map((p) => {
        const {
          tradeableProps,
          untradeableProps,
        } = PropertyManagementService.getPlayerPropertiesForTrade(gameState, p);
        return {
          ...p,
          tradeableProps,
          untradeableProps,
        };
      });
      const sourcePlayer = findById(players, gameState.currentPlayer.id);
      const tradingPartner = findById(players, tradingPartnerId);
      const tradeDetails = {
        [gameState.currentPlayer.id]: [100],
        [tradingPartner.id]: [],
        status: TradeService.TradeStatus.OFFER,
      };
      const tempTradeDetails = cloneDeep(tradeDetails);
      const promptSelectStub = sinon.stub(userInterface, 'promptSelect');
      promptSelectStub.onCall(0).returns(0); // cash
      promptSelectStub.onCall(1).returns(0); // cash
      promptSelectStub.onCall(2).returns(-1); // cancel

      const arbitraryCashAmount = 1;
      const promptNumberStub = sinon.stub(userInterface, 'promptNumber');
      promptNumberStub.returns(arbitraryCashAmount);

      TradeService.request(
        userInterface,
        tradingPartner,
        sourcePlayer,
        tradeDetails,
        tempTradeDetails
      );

      expect(tempTradeDetails).to.deep.equal(
        {
          ...tradeDetails,
          status: TradeService.TradeStatus.OFFER,
        },
        `Updated trade status incorrectly when no change was persisted`
      );
    });

    describe(`ACTION: 'confirm'`, () => {
      const tradingPartnerId = 1;
      const propertyGroup = 'Purple';
      let purpleProps;
      let players;
      let sourcePlayer;
      let tradingPartner;

      beforeEach(() => {
        createMonopoly(gameState, propertyGroup, tradingPartnerId);
        purpleProps = gameState.config.propertyConfig.properties.filter(
          (p) => p.group === propertyGroup
        );
        players = gameState.players.map((p) => {
          const {
            tradeableProps,
            untradeableProps,
          } = PropertyManagementService.getPlayerPropertiesForTrade(
            gameState,
            p
          );
          return {
            ...p,
            tradeableProps,
            untradeableProps,
          };
        });
        sourcePlayer = findById(players, gameState.currentPlayer.id);
        tradingPartner = findById(players, tradingPartnerId);
      });
      it('returns undefined if confirm prompt is false', () => {
        const tradeDetails = {
          tradingPlayerId: tradingPartnerId,
          [tradingPartner.id]: [100],
          [gameState.currentPlayer.id]: [purpleProps[0]],
          status: TradeService.TradeStatus.NEW,
        };

        const displayTradeDetailsUISpy = sinon.spy();
        userInterface.displayTradeDetails = displayTradeDetailsUISpy;

        const confirmUIStub = sinon.stub(userInterface, 'promptConfirm');
        confirmUIStub.returns(false);

        expect(
          TradeService.confirm(
            userInterface,
            gameState,
            sourcePlayer,
            tradingPartner,
            tradeDetails
          )
        ).to.equal(
          undefined,
          `Did not return undefined when prompt to confirm was false`
        );

        expect(
          displayTradeDetailsUISpy.calledOnceWithExactly(
            gameState.currentPlayer.id,
            sourcePlayer,
            tradingPartner,
            tradeDetails
          )
        ).deep.equal(
          true,
          `UI#displayTradeDetails was not called when calling 'info'`
        );
      });
      it('returns true if confirm prompt is true', () => {
        const tradeDetails = {
          tradingPlayerId: tradingPartnerId,
          [tradingPartner.id]: [100],
          [gameState.currentPlayer.id]: [purpleProps[0]],
          status: TradeService.TradeStatus.NEW,
        };

        const displayTradeDetailsUISpy = sinon.spy();
        userInterface.displayTradeDetails = displayTradeDetailsUISpy;

        const confirmUIStub = sinon.stub(userInterface, 'promptConfirm');
        confirmUIStub.returns(true);

        expect(
          TradeService.confirm(
            userInterface,
            gameState,
            sourcePlayer,
            tradingPartner,
            tradeDetails
          )
        ).to.equal(true, `Did not return true when prompt to confirm was true`);

        expect(
          displayTradeDetailsUISpy.calledOnceWithExactly(
            gameState.currentPlayer.id,
            sourcePlayer,
            tradingPartner,
            tradeDetails
          )
        ).deep.equal(
          true,
          `UI#displayTradeDetails was not called when calling 'info'`
        );
      });
      it('updates trade details status to OFFER if previous was not OFFER if confirm prompt is true', () => {
        const tradeDetails = {
          tradingPlayerId: tradingPartnerId,
          [tradingPartner.id]: [100],
          [gameState.currentPlayer.id]: [purpleProps[0]],
          status: TradeService.TradeStatus.NEW,
        };
        const confirmUIStub = sinon.stub(userInterface, 'promptConfirm');
        confirmUIStub.returns(true);

        TradeService.confirm(
          userInterface,
          gameState,
          sourcePlayer,
          tradingPartner,
          tradeDetails
        );

        expect(tradeDetails.status).to.equal(
          TradeService.TradeStatus.OFFER,
          `Did not return OFFER status when prompt to confirm was true from NEW status`
        );
      });
      it('updates trade details status to ACCEPT if previous was OFFER if confirm prompt is true', () => {
        const tradeDetails = {
          tradingPlayerId: tradingPartnerId,
          [tradingPartner.id]: [100],
          [gameState.currentPlayer.id]: [purpleProps[0]],
          status: TradeService.TradeStatus.OFFER,
        };
        const confirmUIStub = sinon.stub(userInterface, 'promptConfirm');
        confirmUIStub.returns(true);

        TradeService.confirm(
          userInterface,
          gameState,
          sourcePlayer,
          tradingPartner,
          tradeDetails
        );

        expect(tradeDetails.status).to.equal(
          TradeService.TradeStatus.ACCEPT,
          `Did not return ACCEPT status when prompt to confirm was true from OFFER status`
        );
      });
      it('CONSTRAINT: does not allow action if only assets have been requested', () => {
        const tradeDetails = {
          tradingPlayerId: tradingPartnerId,
          [tradingPartner.id]: [],
          [gameState.currentPlayer.id]: [purpleProps[0]],
          status: TradeService.TradeStatus.OFFER,
        };
        const confirmUISpy = sinon.spy(userInterface, 'promptConfirm');
        const tradeErrorUISpy = sinon.spy(userInterface, 'tradeError');

        TradeService.confirm(
          userInterface,
          gameState,
          sourcePlayer,
          tradingPartner,
          tradeDetails
        );

        expect(confirmUISpy.callCount).to.equal(
          0,
          `Prompt was called even though no assets were offered in trade before confirmation`
        );
        expect(tradeErrorUISpy.calledOnce).to.equal(
          true,
          `Error message was not called even though no assets were offered in trade before confirmation`
        );
      });
      it('CONSTRAINT: does not allow action if only assets have been offered', () => {
        const tradeDetails = {
          tradingPlayerId: tradingPartnerId,
          [tradingPartner.id]: [100],
          [gameState.currentPlayer.id]: [],
          status: TradeService.TradeStatus.OFFER,
        };
        const confirmUISpy = sinon.spy(userInterface, 'promptConfirm');
        const tradeErrorUISpy = sinon.spy(userInterface, 'tradeError');

        TradeService.confirm(
          userInterface,
          gameState,
          sourcePlayer,
          tradingPartner,
          tradeDetails
        );

        expect(confirmUISpy.callCount).to.equal(
          0,
          `Prompt was called even though no assets were requested in trade before confirmation`
        );
        expect(tradeErrorUISpy.calledOnce).to.equal(
          true,
          `Error message was not called even though no assets were requested in trade before confirmation`
        );
      });
      describe(`ACTION: 'confirm', bankruptcy check`, () => {
        it('CONSTRAINT: does not allow action if trade bankrupts source player', () => {
          const tradingPartnerId = 1;
          const expensiveProperty = findById(
            gameState.config.propertyConfig.properties,
            'boardwalk'
          );
          expensiveProperty.mortgaged = true;
          expensiveProperty.ownedBy = tradingPartnerId;
          const arbitraryLowCashAmount = 20;
          const dollar = 1;
          gameState.currentPlayer.cash = arbitraryLowCashAmount;

          const players = gameState.players.map((p) => {
            const {
              tradeableProps,
              untradeableProps,
            } = PropertyManagementService.getPlayerPropertiesForTrade(
              gameState,
              p
            );
            return {
              ...p,
              tradeableProps,
              untradeableProps,
            };
          });
          const sourcePlayer = findById(players, gameState.currentPlayer.id);
          const tradingPartner = findById(players, tradingPartnerId);

          const tradeDetails = {
            tradingPlayerId: tradingPartnerId,
            [tradingPartner.id]: [expensiveProperty],
            [gameState.currentPlayer.id]: [dollar],
            status: TradeService.TradeStatus.OFFER,
          };
          const confirmUISpy = sinon.spy(userInterface, 'promptConfirm');
          const tradeErrorUISpy = sinon.spy(userInterface, 'tradeError');

          TradeService.confirm(
            userInterface,
            gameState,
            sourcePlayer,
            tradingPartner,
            tradeDetails
          );

          expect(confirmUISpy.callCount).to.equal(
            0,
            `Prompt was called even though no assets were requested in trade before confirmation`
          );
          expect(tradeErrorUISpy.calledOnce).to.equal(
            true,
            `Error message was not called even though trade would bankrupt source player`
          );
        });
        it('CONSTRAINT: does not allow action if trade bankrupts target player', () => {
          const tradingPartnerId = 1;
          const expensiveProperty = findById(
            gameState.config.propertyConfig.properties,
            'boardwalk'
          );
          expensiveProperty.mortgaged = true;
          expensiveProperty.ownedBy = gameState.currentPlayer.id;
          const arbitraryLowCashAmount = 20;
          const dollar = 1;

          const players = gameState.players.map((p) => {
            const {
              tradeableProps,
              untradeableProps,
            } = PropertyManagementService.getPlayerPropertiesForTrade(
              gameState,
              p
            );
            return {
              ...p,
              tradeableProps,
              untradeableProps,
            };
          });
          const sourcePlayer = findById(players, gameState.currentPlayer.id);
          const tradingPartner = findById(players, tradingPartnerId);
          tradingPartner.cash = arbitraryLowCashAmount;

          const tradeDetails = {
            tradingPlayerId: tradingPartnerId,
            [tradingPartner.id]: [dollar],
            [gameState.currentPlayer.id]: [expensiveProperty],
            status: TradeService.TradeStatus.OFFER,
          };
          const confirmUISpy = sinon.spy(userInterface, 'promptConfirm');
          const tradeErrorUISpy = sinon.spy(userInterface, 'tradeError');

          TradeService.confirm(
            userInterface,
            gameState,
            sourcePlayer,
            tradingPartner,
            tradeDetails
          );

          expect(confirmUISpy.callCount).to.equal(
            0,
            `Prompt was called even though no assets were requested in trade before confirmation`
          );
          expect(tradeErrorUISpy.calledOnce).to.equal(
            true,
            `Error message was not called even though trade would bankrupt target player`
          );
        });
        it('CONSTRAINT: allow action if trade does not bankrupt either player', () => {
          const tradingPartnerId = 1;
          const expensiveProperty = findById(
            gameState.config.propertyConfig.properties,
            'boardwalk'
          );
          expensiveProperty.mortgaged = true;
          expensiveProperty.ownedBy = gameState.currentPlayer.id;
          const arbitraryCashAmount = 300;

          const players = gameState.players.map((p) => {
            const {
              tradeableProps,
              untradeableProps,
            } = PropertyManagementService.getPlayerPropertiesForTrade(
              gameState,
              p
            );
            return {
              ...p,
              tradeableProps,
              untradeableProps,
            };
          });
          const sourcePlayer = findById(players, gameState.currentPlayer.id);
          const tradingPartner = findById(players, tradingPartnerId);

          const tradeDetails = {
            tradingPlayerId: tradingPartnerId,
            [tradingPartner.id]: [arbitraryCashAmount],
            [gameState.currentPlayer.id]: [expensiveProperty],
            status: TradeService.TradeStatus.OFFER,
          };
          const confirmUISpy = sinon.spy(userInterface, 'promptConfirm');
          const tradeErrorUISpy = sinon.spy(userInterface, 'tradeError');

          TradeService.confirm(
            userInterface,
            gameState,
            sourcePlayer,
            tradingPartner,
            tradeDetails
          );

          expect(confirmUISpy.callCount).to.equal(
            1,
            `Prompt was called even though no assets were requested in trade before confirmation`
          );
          expect(tradeErrorUISpy.calledOnce).to.equal(
            false,
            `Error message was called even though trade would not bankrupt either player`
          );
        });
      });
    });
  });
});
