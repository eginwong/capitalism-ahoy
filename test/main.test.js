// integration tests
const expect = require("chai").expect;
const sinon = require("sinon");
const EventEmitter = require("events");
const { GameState } = require("../entities/GameState");
const { createPlayer, setupMockDice } = require("./testutils");

function gwt(strings) {
  const statements = strings.raw[0].split(" | ");
  return `GIVEN ${statements[0]} WHEN ${statements[1]} THEN ${statements[2]}`;
}

// write an integration test framework for json

// given when then {P}C{Q}
describe("main", () => {
  describe("feature: starts", () => {
    let gameState;
    let mockUI;
    let eventBusEmitter;
    // mock?
    // spy on functions?
    beforeEach(() => {
      gameState = new GameState();
      gameState.players = [
        createPlayer({ name: "player1" }),
        createPlayer({ name: "player2" }),
      ];
      mockUI = {
        startGame: () => true,
        startTurn: (player) => false,
        displayAvailableActions: (actions) => false,
        prompt: () => true,
        endTurn: () => true,
        rollingDice: () => true,
        rollDiceDisplay: (shouldDisplay) => true,
        payFineDisplay: (shouldDisplay) => true,
        endTurnDisplay: (shouldDisplay) => true,
        diceRollResults: (roll1, roll2) => true,
        rollNormalDice: () => true,
        rollJailDice: () => true,
        caughtSpeeding: () => true,
        playerMovement: (position) => true,
        payFine: () => true,
        passGo: () => true,
        jail: () => true,
        unknownAction: () => true
      };
      eventBusEmitter = new EventEmitter();
    });

    afterEach(() => {
      // Restore the default sandbox here
      sinon.restore();
    });

    it(
      gwt`cold start | game is loaded | first player rolls dice and ends turn`,
      () => {
        require("../entities/Game")(eventBusEmitter, mockUI, gameState);

        // arrange
        const startGameSpy = sinon.spy();
        const promptStub = sinon.stub();
        promptStub.onCall(0).returns("ROLL_DICE");
        promptStub.onCall(1).returns("ROLL_DICE");
        promptStub.onCall(2).returns("END_TURN");
        mockUI.startGame = startGameSpy;
        mockUI.prompt = promptStub;

        // TODO: refactor to be cleaner
        sinon.stub(gameState._allPlayerActions.ROLL_DICE, "execute").callsFake(
          setupMockDice(
            [
              [1, 1],
              [1, 2],
            ],
            eventBusEmitter
          )
        );

        eventBusEmitter.emit("START_GAME");

        expect(startGameSpy.callCount).to.equal(1, "Game did not start");
        expect(gameState.turn).equal(1, "Incorrect turn value");
        expect(gameState.players[0].position).not.to.equal(0, "Player #1 did not move");
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
