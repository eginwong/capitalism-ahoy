const expect = require('chai').expect;
const EventEmitter = require('events');
const sinon = require('sinon');
const mockUIFactory = require('../mocks/UI');

const { GameState } = require('../../entities/GameState');
const PlayerActions = require('../../entities/PlayerActions');
const { createPlayerFactory } = require('../testutils');
const config = require('../../config/monopolyConfiguration');
const { cloneDeep } = require('lodash');

describe('Rules -> AUCTION', () => {
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
      createPlayer({ name: 'player3' }),
    ];
    gameState.config = cloneDeep(config);
  });

  afterEach(() => {
    // Restore the default sandbox here
    sinon.restore();
  });

  describe('auction', () => {
    const inputEvent = 'AUCTION';
    const liquidationEvent = 'LIQUIDATION';
    const turnValuesUpdatedEvent = 'TURN_VALUES_UPDATED';

    let liquidationStub;
    let turnValuesUpdatedSpy;

    beforeEach(() => {
      let { emit: notify } = eventBus;
      notify = notify.bind(eventBus);

      RULES[inputEvent].forEach((handler) =>
        eventBus.on(
          inputEvent,
          handler.bind(null, { notify, UI: userInterface }, gameState)
        )
      );
      liquidationStub = sinon.stub();
      turnValuesUpdatedSpy = sinon.spy();

      eventBus.on(liquidationEvent, liquidationStub);
      eventBus.on(turnValuesUpdatedEvent, turnValuesUpdatedSpy);
    });

    it('should make a call to the UI#auctionInstructions and UI#wonAuction', () => {
      const auctionInstructionsUISpy = sinon.spy();
      const wonAuctionUISpy = sinon.spy();
      userInterface.auctionInstructions = auctionInstructionsUISpy;
      userInterface.wonAuction = wonAuctionUISpy;
      const auctionPromptStub = sinon.stub(PlayerActions, 'auction');
      const bidders = gameState.players.map((player) => ({
        ...player,
        liquidity: require('../../entities/WealthService').calculateLiquidity(
          gameState,
          gameState.config.propertyConfig.properties,
          player
        ),
      }));
      const expectedBuyer = bidders[0];
      auctionPromptStub.returns({ buyer: expectedBuyer, price: 10 });

      eventBus.emit(inputEvent);
      expect(auctionInstructionsUISpy.calledOnce).to.equal(
        true,
        `UI#auctionInstructions method for ${inputEvent} was not called`
      );
      expect(wonAuctionUISpy.calledOnce).to.equal(
        true,
        `UI#wonAuction method for ${inputEvent} was not called`
      );
    });
    it('should make a call to the UI#playerShortOnFunds', () => {
      const uiSpy = sinon.spy();
      userInterface.playerShortOnFunds = uiSpy;
      const auctionPromptStub = sinon.stub(PlayerActions, 'auction');
      const startingAssetValue = 300;
      gameState.players[0].assets = startingAssetValue;
      gameState.turnValues = {
        subTurn: {},
      };

      const bidders = gameState.players.map((player) => ({
        ...player,
        liquidity: require('../../entities/WealthService').calculateLiquidity(
          gameState,
          gameState.config.propertyConfig.properties,
          player
        ),
      }));
      const expectedBuyer = bidders[0];
      auctionPromptStub.returns({
        buyer: expectedBuyer,
        price: expectedBuyer.cash + 1,
      });
      liquidationStub.callsFake(() => {
        gameState.turnValues.subTurn.player = {
          id: bidders[0].id,
          cash: bidders[0].cash + 1,
          assets: bidders[0].assets,
          cards: bidders[0].cards,
        };
        return;
      });

      eventBus.emit(inputEvent);
      expect(uiSpy.calledOnce).to.equal(
        true,
        `UI#playerShortOnFunds method for ${inputEvent} was not called`
      );
    });
    it('should filter out players from the bid for auction if their liquidity is below the base cost', () => {
      const auctionPromptStub = sinon.stub(PlayerActions, 'auction');
      const startingCash =
        gameState.config.propertyConfig.mininumPropertyPrice - 1;
      gameState.players[0].cash = startingCash;
      const bidders = gameState.players.map((player) => ({
        ...player,
        liquidity: require('../../entities/WealthService').calculateLiquidity(
          gameState,
          gameState.config.propertyConfig.properties,
          player
        ),
      }));
      const expectedBuyer = bidders[1];
      auctionPromptStub.returns({
        buyer: expectedBuyer,
        price: expectedBuyer.cash,
      });

      eventBus.emit(inputEvent);
      expect(auctionPromptStub.getCall(0).args[1]).to.deep.equal(
        [bidders[1], bidders[2]],
        `${inputEvent} event did not filter out players with funds below the minimum base cost as defined in the config`
      );
    });
    it('should call auction with ui, eligible players, the property, and the base cost', () => {
      const auctionPromptStub = sinon.stub(PlayerActions, 'auction');
      const bidders = gameState.players.map((player) => ({
        ...player,
        liquidity: require('../../entities/WealthService').calculateLiquidity(
          gameState,
          gameState.config.propertyConfig.properties,
          player
        ),
      }));
      const expectedBuyer = bidders[1];
      auctionPromptStub.returns({
        buyer: expectedBuyer,
        price: expectedBuyer.cash,
      });
      const testProperty = gameState.config.propertyConfig.properties.find(
        (p) => p.id === 'mediterraneanave'
      );
      gameState.currentBoardProperty = testProperty;

      eventBus.emit(inputEvent);
      expect(auctionPromptStub.getCall(0).args).to.deep.equal(
        [
          userInterface,
          bidders,
          testProperty,
          gameState.config.propertyConfig.minimumPropertyPrice,
        ],
        `${inputEvent} event did not pass the desired parameters to the auction prompt`
      );
    });
    it(`should emit ${liquidationEvent} when winner is short on cash`, () => {
      const uiSpy = sinon.spy();
      userInterface.playerShortOnFunds = uiSpy;
      const auctionPromptStub = sinon.stub(PlayerActions, 'auction');
      const startingAssetValue = 300;
      gameState.players[0].assets = startingAssetValue;
      gameState.turnValues = {
        subTurn: {},
      };
      const bidders = gameState.players.map((player) => ({
        ...player,
        liquidity: require('../../entities/WealthService').calculateLiquidity(
          gameState,
          gameState.config.propertyConfig.properties,
          player
        ),
      }));
      const expectedBuyer = bidders[0];
      auctionPromptStub.returns({
        buyer: expectedBuyer,
        price: expectedBuyer.cash + 1,
      });
      liquidationStub.callsFake(() => {
        gameState.turnValues.subTurn.player = {
          id: bidders[0].id,
          cash: bidders[0].cash + 1,
          assets: bidders[0].assets,
          cards: bidders[0].cards,
        };
        return;
      });

      eventBus.emit(inputEvent);
      expect(liquidationStub.calledOnce).to.equal(
        true,
        `${inputEvent} event did not call ${liquidationEvent} when winner is short on funds`
      );
    });
    it(`should emit ${turnValuesUpdatedEvent} when winner is short on cash to allow for subturn`, () => {
      const uiSpy = sinon.spy();
      userInterface.playerShortOnFunds = uiSpy;
      const auctionPromptStub = sinon.stub(PlayerActions, 'auction');
      const startingAssetValue = 300;
      gameState.players[0].assets = startingAssetValue;
      gameState.turnValues = {
        subTurn: {},
      };
      const bidders = gameState.players.map((player) => ({
        ...player,
        liquidity: require('../../entities/WealthService').calculateLiquidity(
          gameState,
          gameState.config.propertyConfig.properties,
          player
        ),
      }));
      const expectedBuyer = bidders[0];
      auctionPromptStub.returns({
        buyer: expectedBuyer,
        price: expectedBuyer.cash + 1,
      });
      liquidationStub.callsFake(() => {
        gameState.turnValues.subTurn.player = {
          id: bidders[0].id,
          cash: bidders[0].cash + 1,
          assets: bidders[0].assets,
          cards: bidders[0].cards,
        };
        return;
      });

      eventBus.emit(inputEvent);
      expect(turnValuesUpdatedSpy.callCount).to.equal(
        2,
        `${inputEvent} event did not call ${turnValuesUpdatedEvent} twice when winner was low on funds`
      );
    });
    it('should purchase asset for the winning player', () => {
      const auctionPromptStub = sinon.stub(PlayerActions, 'auction');
      const bidders = gameState.players.map((player) => ({
        ...player,
        liquidity: require('../../entities/WealthService').calculateLiquidity(
          gameState,
          gameState.config.propertyConfig.properties,
          player
        ),
      }));
      const expectedBuyer = bidders[0];
      auctionPromptStub.returns({
        buyer: expectedBuyer,
        price: expectedBuyer.cash,
      });
      const testProperty = gameState.config.propertyConfig.properties.find(
        (p) => p.id === 'mediterraneanave'
      );
      gameState.currentBoardProperty = testProperty;

      eventBus.emit(inputEvent);
      expect(gameState.players[0].assets).to.equal(
        testProperty.price,
        'Winner of the auction did not receive the asset value of the won property'
      );
      expect(gameState.players[0].cash).to.equal(
        0,
        'Winner of the auction did not pay out the expected bid price'
      );
    });
    it('should change the owner of the property to the winning player', () => {
      const auctionPromptStub = sinon.stub(PlayerActions, 'auction');
      const bidders = gameState.players.map((player) => ({
        ...player,
        liquidity: require('../../entities/WealthService').calculateLiquidity(
          gameState,
          gameState.config.propertyConfig.properties,
          player
        ),
      }));
      const expectedBuyer = bidders[0];
      auctionPromptStub.returns({
        buyer: expectedBuyer,
        price: expectedBuyer.cash,
      });
      const testProperty = gameState.config.propertyConfig.properties.find(
        (p) => p.id === 'mediterraneanave'
      );
      gameState.currentBoardProperty = testProperty;

      eventBus.emit(inputEvent);
      expect(testProperty.ownedBy).to.equal(
        expectedBuyer.id,
        'Winner of the auction did not receive ownership of won property'
      );
    });
    it('should automatically skip the auction if only one player is eligible for the auction', () => {
      const auctionPromptStub = sinon.stub(PlayerActions, 'auction');
      const minBidPrice = gameState.config.propertyConfig.minimumPropertyPrice;
      gameState.players[1].cash = minBidPrice - 1;
      gameState.players[2].cash = minBidPrice - 1;
      const bidders = gameState.players.map((player) => ({
        ...player,
        liquidity: require('../../entities/WealthService').calculateLiquidity(
          gameState,
          gameState.config.propertyConfig.properties,
          player
        ),
      }));
      const expectedBuyer = bidders[0];
      const testProperty = gameState.config.propertyConfig.properties.find(
        (p) => p.id === 'mediterraneanave'
      );
      gameState.currentBoardProperty = testProperty;

      eventBus.emit(inputEvent);
      expect(testProperty.ownedBy).to.equal(
        expectedBuyer.id,
        'Winner of the auction did not receive ownership of won property'
      );
      expect(auctionPromptStub.callCount).to.equal(
        0,
        `${inputEvent} event will skip the auction prompt if only one player is eligible`
      );
    });

    describe('when property is mortgaged', () => {
      it('should call auction with ui, eligible players, the property, and the base cost when mortgage interest rate cost is lower', () => {
        const auctionPromptStub = sinon.stub(PlayerActions, 'auction');
        const bidders = gameState.players.map((player) => ({
          ...player,
          liquidity: require('../../entities/WealthService').calculateLiquidity(
            gameState,
            gameState.config.propertyConfig.properties,
            player
          ),
        }));
        const expectedBuyer = bidders[1];
        auctionPromptStub.returns({
          buyer: expectedBuyer,
          price: expectedBuyer.cash,
        });
        const testProperty = gameState.config.propertyConfig.properties.find(
          (p) => p.id === 'mediterraneanave'
        );
        testProperty.mortgaged = true;
        gameState.currentBoardProperty = testProperty;
        const {
          interestRate,
          minimumPropertyPrice,
        } = gameState.config.propertyConfig;
        const interestCost = testProperty.price * interestRate;
        const minBidCost = Math.max(interestCost, minimumPropertyPrice);

        eventBus.emit(inputEvent);
        expect(auctionPromptStub.getCall(0).args).to.deep.equal(
          [userInterface, bidders, testProperty, minBidCost],
          `${inputEvent} event did not pass the desired parameters to the auction prompt when interest was less than base cost`
        );
      });
      it('should call auction with ui, eligible players, the property, and the base cost when mortgage interest rate cost is higher', () => {
        const auctionPromptStub = sinon.stub(PlayerActions, 'auction');
        const bidders = gameState.players.map((player) => ({
          ...player,
          liquidity: require('../../entities/WealthService').calculateLiquidity(
            gameState,
            gameState.config.propertyConfig.properties,
            player
          ),
        }));
        const expectedBuyer = bidders[1];
        auctionPromptStub.returns({
          buyer: expectedBuyer,
          price: expectedBuyer.cash,
        });
        const testProperty = gameState.config.propertyConfig.properties.find(
          (p) => p.id === 'pennsylvaniaave'
        );
        testProperty.mortgaged = true;
        gameState.currentBoardProperty = testProperty;
        const {
          interestRate,
          minimumPropertyPrice,
        } = gameState.config.propertyConfig;
        const interestCost = testProperty.price * interestRate;
        const minBidCost = Math.max(interestCost, minimumPropertyPrice);

        eventBus.emit(inputEvent);
        expect(auctionPromptStub.getCall(0).args).to.deep.equal(
          [userInterface, bidders, testProperty, minBidCost],
          `${inputEvent} event did not pass the desired parameters to the auction prompt when interest was higher than base cost`
        );
      });
      it('should purchase asset for the winning player', () => {
        const auctionPromptStub = sinon.stub(PlayerActions, 'auction');
        const bidders = gameState.players.map((player) => ({
          ...player,
          liquidity: require('../../entities/WealthService').calculateLiquidity(
            gameState,
            gameState.config.propertyConfig.properties,
            player
          ),
        }));
        const expectedBuyer = bidders[0];
        auctionPromptStub.returns({
          buyer: expectedBuyer,
          price: expectedBuyer.cash,
        });
        const testProperty = gameState.config.propertyConfig.properties.find(
          (p) => p.id === 'mediterraneanave'
        );
        testProperty.mortgaged = true;
        gameState.currentBoardProperty = testProperty;

        eventBus.emit(inputEvent);
        expect(gameState.players[0].assets).to.equal(
          testProperty.price /
            gameState.config.propertyConfig.mortgageValueMultiplier,
          'Winner of the auction did not receive the asset value of the won property'
        );
        expect(gameState.players[0].cash).to.equal(
          0,
          'Winner of the auction did not pay out the expected bid price'
        );
      });
      xit('prompts the winning player to unmortgage the property immediately on winning the auction', () => {
        const auctionPromptStub = sinon.stub(PlayerActions, 'auction');
        const bidders = gameState.players.map((player) => ({
          ...player,
          liquidity: require('../../entities/WealthService').calculateLiquidity(
            gameState,
            gameState.config.propertyConfig.properties,
            player
          ),
        }));
        const expectedBuyer = bidders[0];
        auctionPromptStub.returns({
          buyer: expectedBuyer,
          price: expectedBuyer.cash,
        });
        const testProperty = gameState.config.propertyConfig.properties.find(
          (p) => p.id === 'mediterraneanave'
        );
        testProperty.mortgaged = true;
        gameState.currentBoardProperty = testProperty;

        eventBus.emit(inputEvent);
        expect(gameState.players[0].assets).to.equal(
          testProperty.price /
            gameState.config.propertyConfig.mortgageValueMultiplier,
          'Winner of the auction did not receive the asset value of the won property'
        );
        expect(gameState.players[0].cash).to.equal(
          0,
          'Winner of the auction did not pay out the expected bid price'
        );
      });
    });
  });
});
