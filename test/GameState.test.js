const expect = require("chai").expect;
const { GameState } = require("../entities/GameState");
const { createPlayer } = require("./testutils");

describe("GameState", () => {
  let gameState;
  beforeEach(() => {
    gameState = new GameState();
  });
  it("should return undefined if no players and trying to get current player", () => {
    expect(gameState.currentPlayer).to.equal(undefined);
  });
  it("should retrieve current player", () => {
    gameState.players = [createPlayer({name: "player1"}), createPlayer({name: "player2"}), createPlayer({name: "player3"}), createPlayer({name: "player4"})];
    expect(gameState.currentPlayer.name).to.equal("player1");
    gameState.turn++;
    expect(gameState.currentPlayer.name).to.equal("player2");
    gameState.turn++;
    expect(gameState.currentPlayer.name).to.equal("player3");
    gameState.turn++;
    expect(gameState.currentPlayer.name).to.equal("player4");
    gameState.turn++;
    expect(gameState.currentPlayer.name).to.equal("player1");
  });
  it("should get and set player actions", () => {
    const mockPlayerActions = {
      ROLL_DICE: { execute: () => true },
      PAY_FINE: { execute: () => false }
    }; 
    gameState.allPlayerActions = mockPlayerActions;
    expect(mockPlayerActions).to.deep.equal(gameState.allPlayerActions);

    const actions = gameState.allPlayerActions;
    delete actions["ROLL_DICE"];
    expect(mockPlayerActions).not.to.deep.equal(actions);
  });
  it("should get and set current player actions", () => {
    const mockPlayerActions = {
      ROLL_DICE: { execute: () => true },
      PAY_FINE: { execute: () => false }
    }; 
    gameState.currentPlayerActions = mockPlayerActions;
    expect(mockPlayerActions).to.deep.equal(gameState.currentPlayerActions);

    const actions = gameState.currentPlayerActions;
    delete actions["ROLL_DICE"];
    expect(gameState.currentPlayerActions).to.deep.equal(actions);
  });
});
