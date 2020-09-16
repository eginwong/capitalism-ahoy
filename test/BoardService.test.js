const expect = require('chai').expect;
const BoardService = require('../entities/BoardService');
const { GameState } = require('../entities/GameState');
const { createPlayerFactory } = require('./testutils');
const config = require('../config/monopolyConfiguration');

describe('BoardService', () => {
  let gameState;

  beforeEach(() => {
    gameState = new GameState();
    let createPlayer = createPlayerFactory();
    gameState.players = [createPlayer({ name: 'player1' })];
    gameState.config = config;
  });

  describe('normalizePlayerBoardPosition', () => {
    it('should return current player position if not wrapping around the board', () => {
      gameState.currentPlayer.position = 3;
      expect(BoardService.normalizePlayerBoardPosition(gameState)).to.equal(
        3,
        "Incorrectly lowers current player's position"
      );
    });
    it('should return current player position modded if over length of properties', () => {
      gameState.currentPlayer.position = 42;
      expect(BoardService.normalizePlayerBoardPosition(gameState)).to.equal(
        2,
        "Incorrectly overflows current player's position"
      );
    });
  });

  describe('nearestPropertyByGroupToPlayer', () => {
    it('should return property closest to player by property group when property is before GO', () => {
      gameState.currentPlayer.position = 10;
      const pennsylvaniaRailroadProperty = gameState.config.propertyConfig.properties.find(
        (p) => p.id === 'pennsylvaniarailroad'
      );
      const propertyGroup = pennsylvaniaRailroadProperty.group;

      const actualPropertyReturned = BoardService.nearestPropertyByGroupToPlayer(
        gameState,
        propertyGroup
      );
      expect(actualPropertyReturned).to.equal(
        pennsylvaniaRailroadProperty,
        `Incorrectly returns nearest property by property group ${actualPropertyReturned}`
      );
    });
    it('should return property closest to player by property group when property is after GO', () => {
      gameState.currentPlayer.position = 39;
      const readingRailroadProperty = gameState.config.propertyConfig.properties.find(
        (p) => p.id === 'readingrailroad'
      );
      const propertyGroup = readingRailroadProperty.group;

      const actualPropertyReturned = BoardService.nearestPropertyByGroupToPlayer(
        gameState,
        propertyGroup
      );
      expect(actualPropertyReturned).to.equal(
        readingRailroadProperty,
        `Incorrectly returns nearest property by property group ${actualPropertyReturned}`
      );
    });
  });

  describe('retrievePositionToPropertyWithoutNormalization', () => {
    it('should return property position if not wrapping around the board', () => {
      gameState.currentPlayer.position = 3;
      const readingRailroadProperty = gameState.config.propertyConfig.properties.find(
        (p) => p.id === 'readingrailroad'
      );
      expect(
        BoardService.retrievePositionToPropertyWithoutNormalization(
          gameState,
          readingRailroadProperty
        )
      ).to.equal(
        readingRailroadProperty.position,
        "Incorrectly overflows current player's position"
      );
    });
    it('should return property position added to length of the board if wrapping around the board', () => {
      gameState.currentPlayer.position = 39;
      const readingRailroadProperty = gameState.config.propertyConfig.properties.find(
        (p) => p.id === 'readingrailroad'
      );
      expect(
        BoardService.retrievePositionToPropertyWithoutNormalization(
          gameState,
          readingRailroadProperty
        )
      ).to.equal(
        gameState.config.propertyConfig.properties.length +
          readingRailroadProperty.position,
        "Incorrectly overflows current player's position"
      );
    });
  });
});
