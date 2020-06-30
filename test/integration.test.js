const expect = require("chai").expect;
const sinon = require("sinon");
const EventEmitter = require("events");
const { GameState } = require("../entities/GameState");
const { createPlayer } = require("./testutils");

function gwt(strings) {
  const statements = strings.raw[0].split(" | ");
  return `GIVEN ${statements[0]} WHEN ${statements[1]} THEN ${statements[2]}`;
}

// given when then {P}C{Q}
describe("game", () => {
  describe("feature: starts", () => {
    let gameState;
    let mockUI;
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
      };
    });

    afterEach(() => {
      // Restore the default sandbox here
      sinon.restore();
    });

    it(
      gwt`cold start | game is loaded | first player rolls dice and ends turn`,
      () => {
        var eventBusEmitter = new EventEmitter();
        const startGameSpy = sinon.spy();
        const promptStub = sinon.stub();
        promptStub.onCall(0).returns("ROLL_DICE");
        promptStub.onCall(1).returns("END_TURN");
        promptStub.onCall(2).returns("END_EXECUTION");
        mockUI.startGame = startGameSpy;
        mockUI.prompt = promptStub;

        require("../entities/Game")(eventBusEmitter, mockUI, gameState);
        eventBusEmitter.emit("START_GAME");

        console.dir(gameState);
        expect(startGameSpy.calledOnce).to.be.true;
        expect(gameState.turn).equal(1);
        expect(gameState.players[0].position).not.to.equal(0);
        expect(gameState.players[1].position).to.equal(0);
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
