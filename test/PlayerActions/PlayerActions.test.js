const expect = require("chai").expect;
const EventEmitter = require("events");

const mockUIFactory = require('../mocks/UI');

const { GameState } = require("../../entities/GameState");
const { createPlayer } = require("../testutils");

describe("PlayerActions", function () {
  let gameState;
  let mockUI;
  let eventBusEmitter;
  let PLAYER_ACTIONS;
  
  beforeEach(() => {
    gameState = new GameState();
    eventBusEmitter = new EventEmitter();
    mockUI = mockUIFactory();

    gameState.players = [createPlayer({ name: "player1" })];
    PLAYER_ACTIONS = require("../../entities/PlayerActions")(eventBusEmitter, mockUI, gameState);
  });

  it("exports a valid and well-formed module", () => {
    expect(PLAYER_ACTIONS).to.not.equal(undefined, "Module exported as undefined");
    expect(typeof PLAYER_ACTIONS).to.equal("object", `Module is malformed; exported as ${ typeof PLAYER_ACTIONS } instead of Object`);
    for (let ACTION in PLAYER_ACTIONS) {
      expect(typeof PLAYER_ACTIONS[ACTION].execute).to.equal("function", `${ ACTION } is malformed; missing "execute"`);
      expect(typeof PLAYER_ACTIONS[ACTION].isAvailable).to.equal("function", `${ ACTION } is malformed; missing "isAvailable"`);
      expect(typeof PLAYER_ACTIONS[ACTION].toggleDisplay).to.equal("function", `${ ACTION } is malformed; missing "toggleDisplay"`);
    }
  });
});
