const expect = require('chai').expect;
const sinon = require('sinon');
const mockUIFactory = require('./mocks/UI');

const { GameState } = require('../entities/GameState');
const { createPlayerFactory } = require('./testutils');
const AuctionService = require('../entities/AuctionService');
const config = require('../config/monopolyConfiguration');
const { cloneDeep } = require('lodash');
const { calculateLiquidity } = require('../entities/WealthService');

describe('AuctionService', () => {
  let gameState;

  beforeEach(() => {
    gameState = new GameState();
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

  describe('auction', () => {
    it('re-auctions when no one bids', () => {
      const testBaseCost = 100;
      const testProperty = gameState.config.propertyConfig.properties.find(
        (p) => p.id === 'mediterraneanave'
      );
      const UI = mockUIFactory();
      const playersWithLiquidity = gameState.players.map((player) => ({
        ...player,
        liquidity: calculateLiquidity(
          gameState,
          gameState.config.propertyConfig.properties,
          player
        ),
      }));

      const promptStub = sinon.stub(UI, 'promptNumber');
      promptStub.onCall(0).returns(0);
      promptStub.onCall(1).returns(1);
      promptStub.onCall(2).returns(`${testBaseCost}`);
      promptStub.onCall(3).returns(`${testBaseCost + 1}`);
      promptStub.onCall(4).returns(0);
      promptStub.onCall(5).returns(0);

      AuctionService.auction(
        UI,
        playersWithLiquidity,
        testProperty,
        testBaseCost
      );
      expect(promptStub.callCount).to.equal(
        6,
        `Game did not re-auction when no player provided acceptable bids`
      );
    });
    it('continues auction rounds until only one player is left', () => {
      const testBaseCost = 100;
      const testProperty = gameState.config.propertyConfig.properties.find(
        (p) => p.id === 'mediterraneanave'
      );
      const UI = mockUIFactory();
      const playersWithLiquidity = gameState.players.map((player) => ({
        ...player,
        liquidity: calculateLiquidity(
          gameState,
          gameState.config.propertyConfig.properties,
          player
        ),
      }));

      const promptStub = sinon.stub(UI, 'promptNumber');
      promptStub.onCall(0).returns(0);
      promptStub.onCall(1).returns(`${testBaseCost + 1}`);
      promptStub.onCall(2).returns(`${testBaseCost + 2}`);
      promptStub.onCall(3).returns(`${testBaseCost + 3}`);
      promptStub.onCall(4).returns(`${testBaseCost + 4}`);
      promptStub.onCall(5).returns(`${testBaseCost + 5}`);
      promptStub.onCall(6).returns(0);

      AuctionService.auction(
        UI,
        playersWithLiquidity,
        testProperty,
        testBaseCost
      );
      expect(promptStub.callCount).to.equal(
        7,
        `Game did not continue auction rounds with fewer players`
      );
    });
    it('calls expected UI calls for auction process', () => {
      const testBaseCost = 100;
      const testProperty = gameState.config.propertyConfig.properties.find(
        (p) => p.id === 'mediterraneanave'
      );
      const UI = mockUIFactory();
      const playersWithLiquidity = gameState.players.map((player) => ({
        ...player,
        liquidity: calculateLiquidity(
          gameState,
          gameState.config.propertyConfig.properties,
          player
        ),
      }));
      const displayPropertyDetailsUISpy = sinon.spy();
      UI.displayPropertyDetails = displayPropertyDetailsUISpy;
      const playersInAuctionUISpy = sinon.spy();
      UI.playersInAuction = playersInAuctionUISpy;
      const playerInAuctionUISpy = sinon.spy();
      UI.playerInAuction = playerInAuctionUISpy;
      const playerOutOfAuctionUISpy = sinon.spy();
      UI.playerOutOfAuction = playerOutOfAuctionUISpy;

      const promptStub = sinon.stub(UI, 'promptNumber');
      promptStub.onCall(0).returns(0);
      promptStub.onCall(1).returns(`${testBaseCost + 1}`);
      promptStub.onCall(2).returns(0);

      AuctionService.auction(
        UI,
        playersWithLiquidity,
        testProperty,
        testBaseCost
      );
      expect(displayPropertyDetailsUISpy.calledOnce).to.equal(
        true,
        `Game did not announce the property to be auctioned`
      );
      expect(
        playersInAuctionUISpy.calledOnceWithExactly(playersWithLiquidity)
      ).to.equal(
        true,
        `Game did not announce the players participating in the auction`
      );
      expect(playerInAuctionUISpy.calledThrice).to.equal(
        true,
        `Game did not announce each player per auction round`
      );
      expect(playerOutOfAuctionUISpy.calledTwice).to.equal(
        true,
        `Game did not announce the players who were eliminated from the auction`
      );
    });
    it('filters players out of the auction so that subsequent rounds are shorter', () => {
      const testBaseCost = 100;
      const testProperty = gameState.config.propertyConfig.properties.find(
        (p) => p.id === 'mediterraneanave'
      );
      const UI = mockUIFactory();
      const playersWithLiquidity = gameState.players.map((player) => ({
        ...player,
        liquidity: calculateLiquidity(
          gameState,
          gameState.config.propertyConfig.properties,
          player
        ),
      }));

      const promptStub = sinon.stub(UI, 'promptNumber');
      promptStub.onCall(0).returns(0);
      promptStub.onCall(1).returns(`${testBaseCost + 1}`);
      promptStub.onCall(2).returns(`${testBaseCost + 2}`);
      promptStub.onCall(3).returns(`${testBaseCost + 3}`);
      promptStub.onCall(4).returns(0);
      const expectedWinner = playersWithLiquidity[1];
      const expectedCost = testBaseCost + 3;

      expect(
        AuctionService.auction(
          UI,
          playersWithLiquidity,
          testProperty,
          testBaseCost
        )
      ).to.deep.equal(
        { buyer: expectedWinner, price: expectedCost.toString() },
        `Auction did not filter out players from the auction`
      );
    });
    it('eliminates player if bid is not a number', () => {
      const testBaseCost = 100;
      const testProperty = gameState.config.propertyConfig.properties.find(
        (p) => p.id === 'mediterraneanave'
      );
      const UI = mockUIFactory();
      const playersWithLiquidity = gameState.players.map((player) => ({
        ...player,
        liquidity: calculateLiquidity(
          gameState,
          gameState.config.propertyConfig.properties,
          player
        ),
      }));

      const promptStub = sinon.stub(UI, 'promptNumber');
      promptStub.onCall(0).returns('0.1abc');
      promptStub.onCall(1).returns(`-`);
      promptStub.onCall(2).returns(`${testBaseCost + 1}`);
      const expectedWinner = playersWithLiquidity[2];
      const expectedCost = testBaseCost + 1;

      expect(
        AuctionService.auction(
          UI,
          playersWithLiquidity,
          testProperty,
          testBaseCost
        )
      ).to.deep.equal(
        { buyer: expectedWinner, price: expectedCost.toString() },
        `Auction did not eliminate non-numerical input`
      );
    });
    it('eliminates player if bid is below current lowest bid', () => {
      const testBaseCost = 100;
      const testProperty = gameState.config.propertyConfig.properties.find(
        (p) => p.id === 'mediterraneanave'
      );
      const UI = mockUIFactory();
      const playersWithLiquidity = gameState.players.map((player) => ({
        ...player,
        liquidity: calculateLiquidity(
          gameState,
          gameState.config.propertyConfig.properties,
          player
        ),
      }));

      const promptStub = sinon.stub(UI, 'promptNumber');
      promptStub.onCall(0).returns(0);
      promptStub.onCall(1).returns(`${testBaseCost + 1}`);
      promptStub.onCall(2).returns(`${testBaseCost + 2}`);
      promptStub.onCall(3).returns(`${testBaseCost + 2}`);
      promptStub.onCall(4).returns(0);
      const expectedWinner = playersWithLiquidity[2];
      const expectedCost = testBaseCost + 2;

      expect(
        AuctionService.auction(
          UI,
          playersWithLiquidity,
          testProperty,
          testBaseCost
        )
      ).to.deep.equal(
        { buyer: expectedWinner, price: expectedCost.toString() },
        `Auction did not filter out player bid that is below minimum bidding cost`
      );
    });
    it("eliminates player if bid is above player's liquidity", () => {
      const testBaseCost = 100;
      const testProperty = gameState.config.propertyConfig.properties.find(
        (p) => p.id === 'mediterraneanave'
      );
      const UI = mockUIFactory();
      const playersWithLiquidity = gameState.players.map((player) => ({
        ...player,
        liquidity: calculateLiquidity(
          gameState,
          gameState.config.propertyConfig.properties,
          player
        ),
      }));

      const promptStub = sinon.stub(UI, 'promptNumber');
      promptStub.onCall(0).returns(0);
      promptStub.onCall(1).returns(`${testBaseCost + 1}`);
      promptStub.onCall(2).returns(`${playersWithLiquidity[2].liquidity + 1}`);
      const expectedWinner = playersWithLiquidity[1];
      const expectedCost = testBaseCost + 1;

      expect(
        AuctionService.auction(
          UI,
          playersWithLiquidity,
          testProperty,
          testBaseCost
        )
      ).to.deep.equal(
        { buyer: expectedWinner, price: expectedCost.toString() },
        `Auction did not filter out player bid that is above player liquidity`
      );
    });
    it('returns buyer and price at the end of the auction', () => {
      const testBaseCost = 100;
      const testProperty = gameState.config.propertyConfig.properties.find(
        (p) => p.id === 'mediterraneanave'
      );
      const UI = mockUIFactory();
      const playersWithLiquidity = gameState.players.map((player) => ({
        ...player,
        liquidity: calculateLiquidity(
          gameState,
          gameState.config.propertyConfig.properties,
          player
        ),
      }));

      const promptStub = sinon.stub(UI, 'promptNumber');
      promptStub.onCall(0).returns(0);
      promptStub.onCall(1).returns(`${testBaseCost + 1}`);
      promptStub.onCall(2).returns(`${testBaseCost + 2}`);
      promptStub.onCall(3).returns(`${testBaseCost + 3}`);
      promptStub.onCall(4).returns(`${testBaseCost + 4}`);
      promptStub.onCall(5).returns(`${testBaseCost + 5}`);
      promptStub.onCall(6).returns(0);
      const expectedWinner = playersWithLiquidity[1];
      const expectedCost = testBaseCost + 5;

      expect(
        AuctionService.auction(
          UI,
          playersWithLiquidity,
          testProperty,
          testBaseCost
        )
      ).to.deep.equal(
        { buyer: expectedWinner, price: expectedCost.toString() },
        `Auction did not return buyer and expected cost`
      );
    });
    it("returns player's highest bid even if the following round, they enter in an invalid bid", () => {
      const testBaseCost = 100;
      const testProperty = gameState.config.propertyConfig.properties.find(
        (p) => p.id === 'mediterraneanave'
      );
      const UI = mockUIFactory();
      const playersWithLiquidity = gameState.players.map((player) => ({
        ...player,
        liquidity: calculateLiquidity(
          gameState,
          gameState.config.propertyConfig.properties,
          player
        ),
      }));

      const promptStub = sinon.stub(UI, 'promptNumber');
      promptStub.onCall(0).returns(0);
      promptStub.onCall(1).returns(`${testBaseCost + 1}`);
      promptStub.onCall(2).returns(`${testBaseCost + 2}`);
      promptStub.onCall(3).returns(`${testBaseCost + 1}`);
      promptStub.onCall(4).returns(0);
      const expectedWinner = playersWithLiquidity[2];
      const expectedCost = testBaseCost + 2;

      expect(
        AuctionService.auction(
          UI,
          playersWithLiquidity,
          testProperty,
          testBaseCost
        )
      ).to.deep.equal(
        { buyer: expectedWinner, price: expectedCost.toString() },
        `Auction did not return highest player's bid even though their subsequent bid was not accepted`
      );
    });
  });
});
