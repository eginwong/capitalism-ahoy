const expect = require('chai').expect;
const WealthService = require('../entities/WealthService');
const { GameState } = require('../entities/GameState');
const { createPlayerFactory } = require('./testutils');
const { cloneDeep } = require('lodash');
const config = require('../config/monopolyConfiguration.json');

describe('WealthService', () => {
  let gameState;

  beforeEach(() => {
    gameState = new GameState();
    let createPlayer = createPlayerFactory();
    gameState.players = [
      createPlayer({ name: 'player1' }),
      createPlayer({ name: 'player2' }),
    ];
    gameState.config = cloneDeep(config);
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
    it("should increase player's assets by optional asset value", () => {
      const startingAssets = gameState.players[0].assets;
      const assetPrice = 200;
      const assetValue = 300;
      WealthService.buyAsset(gameState.players[0], assetPrice, assetValue);
      expect(gameState.players[0].assets).to.equal(
        startingAssets + assetValue,
        "Incorrectly increases player's assets"
      );
    });
  });
  describe('sellAsset', () => {
    it('should deposit cash from player equal to buildingPrice param', () => {
      const startingCash = gameState.players[0].cash;
      const buildingPrice = 200;
      WealthService.sellAsset(gameState.players[0], buildingPrice);
      expect(gameState.players[0].cash).to.equal(
        startingCash + buildingPrice,
        "Incorrectly deposits player's cash"
      );
    });
    it("should decrease a player's assets by buildingPrice", () => {
      const startingAssets = gameState.players[0].assets;
      const buildingPrice = 200;
      WealthService.sellAsset(gameState.players[0], buildingPrice);
      expect(gameState.players[0].assets).to.equal(
        startingAssets - buildingPrice,
        "Incorrectly decreases player's assets"
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
  describe('exchangeAsset', () => {
    it('should increment assets of target player', () => {
      const startingPlayer2Assets = gameState.players[1].assets;
      const assetPrice = 50;
      WealthService.exchangeAsset(
        gameState.players[0],
        gameState.players[1],
        assetPrice
      );
      expect(gameState.players[1].assets).to.equal(
        startingPlayer2Assets + assetPrice,
        "Incorrectly incremented target player's assets from exchange"
      );
    });
    it('should decrement assets of source player', () => {
      const startingPlayer1Assets = gameState.players[0].assets;
      const assetPrice = 50;
      WealthService.exchangeAsset(
        gameState.players[0],
        gameState.players[1],
        assetPrice
      );
      expect(gameState.players[0].assets).to.equal(
        startingPlayer1Assets - assetPrice,
        "Incorrectly decremented source player's assets from exchange"
      );
    });
  });
  describe('calculateLiquidity', () => {
    it('should calculate with mortgaged assets', () => {
      const properties = [
        {
          price: 60,
          houseCost: 50,
          buildings: 0,
          mortgaged: false,
          ownedBy: 0,
        },
        { price: 60, houseCost: 50, buildings: 0, mortgaged: true, ownedBy: 0 },
      ];

      expect(WealthService.calculateLiquidity(gameState, properties)).to.equal(
        1530,
        `Liquidity value does not match properties with mortgaged assets`
      );
    });
    it('should calculate with constructed houses/hotels', () => {
      const properties = [
        {
          price: 60,
          houseCost: 50,
          buildings: 0,
          mortgaged: false,
          ownedBy: 0,
        },
        {
          price: 60,
          houseCost: 50,
          buildings: 5,
          mortgaged: false,
          ownedBy: 0,
        },
      ];

      expect(WealthService.calculateLiquidity(gameState, properties)).to.equal(
        1685,
        `Liquidity value does not match properties with assets and buildings`
      );
    });
    it('should calculate with no owned properties', () => {
      const properties = [];
      expect(WealthService.calculateLiquidity(gameState, properties)).to.equal(
        1500,
        `Liquidity value does not match properties with no assets`
      );
    });
    it('should calculate with special properties', () => {
      const properties = [
        {
          price: 60,
          houseCost: 50,
          buildings: 0,
          mortgaged: false,
          ownedBy: 0,
        },
        { price: 150, mortgaged: false, ownedBy: 0 },
        { price: 200, mortgaged: false, ownedBy: 0 },
      ];

      expect(WealthService.calculateLiquidity(gameState, properties)).to.equal(
        1705,
        `Liquidity value does not match properties with special assets`
      );
    });
    it('should calculate specific player', () => {
      const properties = [
        {
          price: 60,
          houseCost: 50,
          buildings: 0,
          mortgaged: false,
          ownedBy: 1,
        },
        { price: 150, mortgaged: false, ownedBy: 1 },
        { price: 200, mortgaged: false, ownedBy: 1 },
      ];

      expect(
        WealthService.calculateLiquidity(
          gameState,
          properties,
          gameState.players[1]
        )
      ).to.equal(1705, `Liquidity value does not match specified player`);
    });
  });
});
