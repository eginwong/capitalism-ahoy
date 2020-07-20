const expect = require("chai").expect;
const EventEmitter = require("events");
const sinon = require("sinon");
const mockUIFactory = require("../mocks/UI");

const { GameState } = require("../../entities/GameState");
const { createPlayer } = require("../testutils");

describe("Rules -> SPEEDING", () => {
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

  describe("speeding", () => {
    const inputEvent = "SPEEDING";
    const jailEvent = "JAIL";

    let jailSpy;

    beforeEach(() => {
      let { emit: notify } = eventBus;
      notify = notify.bind(eventBus);

      RULES[inputEvent].forEach((handler) =>
        eventBus.on(
          inputEvent,
          handler.bind(null, { notify, UI: userInterface }, gameState)
        )
      );
      jailSpy = sinon.spy();

      eventBus.on(jailEvent, jailSpy);
    });

    it("should make a call to the UI#caughtSpeeding", () => {
      const uiSpy = sinon.spy();
      userInterface.caughtSpeeding = uiSpy;
      eventBus.emit(inputEvent);
      expect(uiSpy.calledOnce).to.equal(
        true,
        `Initial UI method for ${inputEvent} was not called`
      );
    });
    it(`the ${ jailEvent } event should be called`, () => {
      eventBus.emit(inputEvent);
      expect(jailSpy.callCount).to.equal(1, `${ jailEvent } was not called`);
    })
  });
});
