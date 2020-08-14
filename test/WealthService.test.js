const expect = require('chai').expect;
const WealthService = require('../entities/WealthService');
const { GameState } = require('../entities/GameState');
const { createPlayer } = require('./testutils');
const config = require('../config/monopolyConfiguration');

describe('WealthService', () => {
  let gameState;

  beforeEach(() => {
    gameState = new GameState();
    gameState.players = [
      createPlayer({ name: 'player1' }),
      createPlayer({ name: 'player2' }),
    ];
    gameState.config = config;
  });

  describe('increment', () => {
    it("should add amount to player's cash", () => {
      const startingCash = gameState.players[0].cash;
      const incrementAmount = 200;
      WealthService.increment(gameState.players[0], incrementAmount);
      expect(gameState.players[0].cash).to.equal(
        startingCash + incrementAmount,
        'Incorrect increment amount'
      );
    });
  });
  describe('decrement', () => {
    it("should remove amount from player's cash", () => {
      const startingCash = gameState.players[0].cash;
      const decrementAmount = 200;
      WealthService.decrement(gameState.players[0], decrementAmount);
      expect(gameState.players[0].cash).to.equal(
        startingCash - decrementAmount,
        'Incorrect decrement amount'
      );
    });
  });
  describe('buyAsset', () => {
    it('should withdraw cash from player equal to assetPrice', () => {
      const startingCash = gameState.players[0].cash;
      const assetPrice = 200;
      WealthService.buyAsset(gameState.players[0], assetPrice);
      expect(gameState.players[0].cash).to.equal(
        startingCash - assetPrice,
        "Incorrectly withdraws player's cash"
      );
    });
    it("should increase player's assets by assetPrice", () => {
      const startingAssets = gameState.players[0].assets;
      const assetPrice = 200;
      WealthService.buyAsset(gameState.players[0], assetPrice);
      expect(gameState.players[0].assets).to.equal(
        startingAssets + assetPrice,
        "Incorrectly increases player's assets"
      );
    });
  });
  describe('calculateNetWorth', () => {
    it('should calculate net worth as cash + assets', () => {
      const cashAmount = 1200;
      const assetAmount = 630;
      gameState.players[0].cash = cashAmount;
      gameState.players[0].assets = assetAmount;
      expect(WealthService.calculateNetWorth(gameState.players[0])).to.equal(
        cashAmount + assetAmount,
        "Incorrectly calculated player's net worth"
      );
    });
  });
  describe('exchange', () => {
    it('should increment cash of target player', () => {
      const startingPlayer2Cash = gameState.players[1].cash;
      const cashAmount = 50;
      WealthService.exchange(
        gameState.players[0],
        gameState.players[1],
        cashAmount
      );
      expect(gameState.players[1].cash).to.equal(
        startingPlayer2Cash + cashAmount,
        "Incorrectly incremented target player's cash from exchange"
      );
    });
    it('should decrement cash of source player', () => {
      const startingPlayer1Cash = gameState.players[0].cash;
      const cashAmount = 50;
      WealthService.exchange(
        gameState.players[0],
        gameState.players[1],
        cashAmount
      );
      expect(gameState.players[0].cash).to.equal(
        startingPlayer1Cash - cashAmount,
        "Incorrectly decremented source player's cash from exchange"
      );
    });
  });
  describe('calculateLiquidity', () => {
    it('should calculate with mortgaged assets');
    it('should calculate with constructed houses/hotels');
    it('should calculate with no owned properties');
  });
});
