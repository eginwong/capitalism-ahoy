const expect = require('chai').expect;
const BoardService = require('../entities/BoardService');
const { GameState } = require('../entities/GameState');
const { createPlayerFactory } = require('./testutils');
const config = require('../config/monopolyConfiguration');
const { findById, findByPosition } = require('../entities/helpers');

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
      const positionWithinBoardLength = 3;
      gameState.currentPlayer.position = positionWithinBoardLength;
      expect(BoardService.normalizePlayerBoardPosition(gameState)).to.equal(
        positionWithinBoardLength,
        "Incorrectly lowers current player's position"
      );
    });
    it('should return current player position modded if over length of properties', () => {
      const positionOverBoardLength = 42;
      gameState.currentPlayer.position = positionOverBoardLength;
      expect(BoardService.normalizePlayerBoardPosition(gameState)).to.equal(
        positionOverBoardLength -
          gameState.config.propertyConfig.properties.length,
        "Incorrectly overflows current player's position"
      );
    });
  });

  describe('getPropertyAtPosition', () => {
    it("should retrieve property of player's position", () => {
      const targetPlayer = gameState.players[0];
      const arbitraryPosition = 12;
      targetPlayer.position = arbitraryPosition;
      const expectedProperty = findByPosition(
        gameState.config.propertyConfig.properties,
        arbitraryPosition
      );

      expect(
        BoardService.getPropertyAtPosition(gameState, targetPlayer)
      ).to.deep.equal(
        expectedProperty,
        "Incorrectly returns board space at the given player's position"
      );
    });
  });

  describe('nearestPropertyByGroupToPlayer', () => {
    it('should return property closest to player by property group when property is before GO', () => {
      const startingPlayerPosition = 10;
      gameState.currentPlayer.position = startingPlayerPosition;
      const pennsylvaniaRailroadProperty = findById(
        gameState.config.propertyConfig.properties,
        'pennsylvaniarailroad'
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
      const startingPlayerPosition = 39;
      gameState.currentPlayer.position = startingPlayerPosition;
      const readingRailroadProperty = findById(
        gameState.config.propertyConfig.properties,
        'readingrailroad'
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
      const startingPlayerPosition = 3;
      gameState.currentPlayer.position = startingPlayerPosition;
      const readingRailroadProperty = findById(
        gameState.config.propertyConfig.properties,
        'readingrailroad'
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
      const startingPlayerPosition = 39;
      gameState.currentPlayer.position = startingPlayerPosition;
      const readingRailroadProperty = findById(
        gameState.config.propertyConfig.properties,
        'readingrailroad'
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
