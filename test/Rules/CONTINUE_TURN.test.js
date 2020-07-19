const expect = require("chai").expect;
const EventEmitter = require("events");
const sinon = require("sinon");
const mockUIFactory = require("../mocks/UI");

const { GameState } = require("../../entities/GameState");
const { createPlayer } = require("../testutils");
const PlayerActions = require("../../entities/PlayerActions");

describe("Rules -> CONTINUE_TURN", () => {
  let gameState;
  let userInterface;
  let eventBus;
  const RULES = require("../../entities/Rules");

  beforeEach(() => {
    gameState = new GameState();
    eventBus = new EventEmitter();
    userInterface = mockUIFactory();
    gameState.players = [createPlayer({ name: "player1" })];
  });

  afterEach(() => {
    // Restore the default sandbox here
    sinon.restore();
  });

  describe("continueTurn", () => {
    const inputEvent = "CONTINUE_TURN";
    const rollDiceEvent = "ROLL_DICE";
    const continueTurnEvent = "CONTINUE_TURN";
    let continueTurnSpy;
    let rollDiceSpy;

    beforeEach(() => {
      let { emit: notify } = eventBus;
      notify = notify.bind(eventBus);

      RULES[inputEvent].forEach((handler) =>
        eventBus.on(
          inputEvent,
          handler.bind(null, { notify, UI: userInterface }, gameState)
        )
      );

      continueTurnSpy = sinon.spy();
      rollDiceSpy = sinon.spy();
      eventBus.on(continueTurnEvent, continueTurnSpy);
      eventBus.on(rollDiceEvent, rollDiceSpy);
    });

    it(`should emit desired ${rollDiceEvent} event`, () => {
      const promptStub = sinon.stub(PlayerActions, "prompt");
      promptStub.onCall(0).returns("ROLL_DICE");
      eventBus.emit(inputEvent);
      expect(rollDiceSpy.callCount).to.equal(
        1,
        `${rollDiceEvent} event was not called`
      );
    });
    it("should make a call to the UI#unknownAction if action input is not recognized", () => {
      const uiSpy = sinon.spy();
      userInterface.unknownAction = uiSpy;

      const promptStub = sinon.stub(PlayerActions, "prompt");
      promptStub.onCall(0).returns(undefined);
      promptStub.onCall(1).returns("ROLL_DICE");
      eventBus.emit(inputEvent);
      expect(uiSpy.calledOnce).to.equal(
        true,
        `UI method for ${inputEvent} was not called`
      );
      expect(continueTurnSpy.callCount).to.equal(
        2,
        "Unknown action did not trigger continue turn event again"
      );
    });
  });
});
