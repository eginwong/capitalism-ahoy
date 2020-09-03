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
});
