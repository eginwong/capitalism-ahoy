const expect = require('chai').expect;
const { GameState } = require('../entities/GameState');
const { createPlayer } = require('./testutils');

describe('GameState', () => {
  let gameState;
  beforeEach(() => {
    gameState = new GameState();
  });
  it('should return undefined if no players and trying to get current player', () => {
    expect(gameState.currentPlayer).to.equal(undefined);
  });
  it('should retrieve current player', () => {
    gameState.players = [
      createPlayer({ name: 'player1' }),
      createPlayer({ name: 'player2' }),
      createPlayer({ name: 'player3' }),
      createPlayer({ name: 'player4' }),
    ];
    expect(gameState.currentPlayer.name).to.equal(
      'player1',
      `Incorrect current player ${gameState.currentPlayer.name}`
    );
    gameState.turn++;
    expect(gameState.currentPlayer.name).to.equal(
      'player2',
      `Incorrect current player ${gameState.currentPlayer.name}`
    );
    gameState.turn++;
    expect(gameState.currentPlayer.name).to.equal(
      'player3',
      `Incorrect current player ${gameState.currentPlayer.name}`
    );
    gameState.turn++;
    expect(gameState.currentPlayer.name).to.equal(
      'player4',
      `Incorrect current player ${gameState.currentPlayer.name}`
    );
    gameState.turn++;
    expect(gameState.currentPlayer.name).to.equal(
      'player1',
      `Incorrect current player ${gameState.currentPlayer.name}`
    );
  });
});
