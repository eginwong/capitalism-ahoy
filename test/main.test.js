// integration tests
const expect = require("chai").expect;
const sinon = require("sinon");
const EventEmitter = require("events");
const { GameState } = require("../entities/GameState");
const { createPlayer } = require("./testutils");
const mockUIFactory = require("./mocks/UI");
const Dice = require("../entities/Components/Dice");
const PlayerActions = require("../entities/PlayerActions");
const config = require("../config/monopolyConfiguration");

function gwt(strings) {
  const statements = strings.raw[0].split(" | ");
  return `GIVEN ${statements[0]} WHEN ${statements[1]} THEN ${statements[2]}`;
}

// write an integration test framework for json

// given when then {P}C{Q}
describe("main", () => {
  describe("feature: starts", () => {
    let gameState;
    let userInterface;
    let eventBus;
    // mock?
    // spy on functions?
    beforeEach(() => {
      gameState = new GameState();
      gameState.players = [
        createPlayer({ name: "player1" }),
        createPlayer({ name: "player2" }),
      ];
      gameState.config = config;
      userInterface = mockUIFactory();
      eventBus = new EventEmitter();
    });

    afterEach(() => {
      // Restore the default sandbox here
      sinon.restore();
    });

    it(
      gwt`cold start | game is loaded | first player rolls dice and ends turn`,
      () => {
        // arrange
        const promptStub = sinon.stub(PlayerActions, "prompt");
        promptStub.onCall(0).returns("ROLL_DICE");
        promptStub.onCall(1).returns("ROLL_DICE");
        promptStub.onCall(2).returns("END_TURN");
        promptStub.onCall(3).returns("END_GAME");
        const startGameSpy = sinon.spy();
        userInterface.startGame = startGameSpy;
        userInterface.prompt = promptStub;

        const diceStub = sinon.stub(Dice, "roll");
        diceStub.onCall(0).returns([1, 1]);
        diceStub.onCall(1).returns([1, 2]);

        require("../entities/Game")({ eventBus, userInterface, gameState });

        expect(startGameSpy.callCount).to.equal(1, "Game did not start");
        expect(gameState.turn).equal(1, "Incorrect turn value");
        expect(gameState.players[0].position).to.equal(
          5,
          "Player #1 did not move"
        );
        expect(gameState.players[1].position).to.equal(0, "Player #2 moved");
      }
    );

    it(
      gwt`cold start | game is loaded | cannot end turn if first doubles has been rolled`,
      () => {
        // continue or start
      }
    );
  });
});
