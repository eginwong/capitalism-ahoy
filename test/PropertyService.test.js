const expect = require('chai').expect;
const PropertyService = require('../entities/PropertyService');
const { GameState } = require('../entities/GameState');
const { createPlayer } = require('./testutils');
const config = require('../config/monopolyConfiguration');

describe('PropertyService', () => {
  let gameState;

  beforeEach(() => {
    gameState = new GameState();
    gameState.players = [createPlayer({ name: 'player1' })];
    gameState.config = config;
  });

  describe('findProperty', () => {
    it('should return property if id is found', () => {
      expect(PropertyService.findProperty(gameState, 'jail')).to.deep.equal(
        {
          name: 'Jail / Just Visiting',
          id: 'jail',
          position: 10,
          group: 'Special',
        },
        'Incorrect property retrieved from findProperty'
      );
    });
    it('should return undefined if id is not found in properties', () => {
      expect(PropertyService.findProperty(gameState, 'nonsense')).to.be
        .undefined;
    });
  });
  describe('findPlayerBoardPosition', () => {
    it('should return current player position if not wrapping around the board', () => {
      gameState.currentPlayer.position = 3;
      expect(PropertyService.findPlayerBoardPosition(gameState)).to.equal(
        3,
        "Incorrectly lowers current player's position"
      );
    });
    it('should return current player position modded if over length of properties', () => {
      gameState.currentPlayer.position = 42;
      expect(PropertyService.findPlayerBoardPosition(gameState)).to.equal(
        2,
        "Incorrectly overflows current player's position"
      );
    });
  });
  describe('getCurrentBoardProperty', () => {
    it('should retrieve board property of current player', () => {
      gameState.currentPlayer.position = 3;
      const boardPosition = PropertyService.getCurrentBoardProperty(gameState);
      expect(boardPosition).to.deep.equal(
        {
          name: 'Baltic Avenue',
          id: 'balticave',
          position: 3,
          price: 60,
          rent: 4,
          multpliedrent: [20, 60, 180, 320, 450],
          housecost: 50,
          group: 'Purple',
          ownedby: -1,
          buildings: 0,
          mortgaged: false,
        },
        `Incorrect board property returned from current player's position`
      );
    });
  });
});
