const expect = require("chai").expect;
const EventEmitter = require("events");
const sinon = require("sinon");
const mockUIFactory = require("../mocks/UI");

const { GameState } = require("../../entities/GameState");
const { createPlayer } = require("../testutils");
const Dice = require("../../entities/Components/Dice");

describe("Rules -> ROLL_DICE", () => {
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

  describe("rollDice", () => {
    const inputEvent = "ROLL_DICE";
    const moveRollEvent = "MOVE_ROLL";
    const jailRollEvent = "JAIL_ROLL";
    const turnValuesUpdatedEvent = "TURN_VALUES_UPDATED";
    const continueTurnEvent = "CONTINUE_TURN";

    let continueTurnSpy;
    let turnValuesUpdatedSpy;
    let moveRollSpy;
    let jailRollSpy;

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
      turnValuesUpdatedSpy = sinon.spy();
      moveRollSpy = sinon.spy();
      jailRollSpy = sinon.spy();

      eventBus.on(continueTurnEvent, continueTurnSpy);
      eventBus.on(turnValuesUpdatedEvent, turnValuesUpdatedSpy);
      eventBus.on(moveRollEvent, moveRollSpy);
      eventBus.on(jailRollEvent, jailRollSpy);
    });

    it("should make a call to the UI#rollingDice", () => {
      const uiSpy = sinon.spy();
      userInterface.rollingDice = uiSpy;
      eventBus.emit(inputEvent);
      expect(uiSpy.calledOnce).to.equal(
        true,
        `Initial UI method for ${inputEvent} was not called`
      );
    });
    it(`should update gameState with dice roll`, () => {
      const fakeRollResults = [1, 2];
      const diceStub = sinon.stub(Dice, "roll");
      diceStub.returns(fakeRollResults);
      eventBus.emit(inputEvent);
      expect(gameState.turnValues.roll).to.deep.equal(
        fakeRollResults,
        "GameState turnValue should be updated with roll results"
      );
    });
    it(`should emit ${turnValuesUpdatedEvent} event after dice roll`, () => {
      const diceStub = sinon.stub(Dice, "roll");
      diceStub.returns([1, 2]);
      eventBus.emit(inputEvent);
      expect(turnValuesUpdatedSpy.calledOnce).to.equal(
        true,
        `${turnValuesUpdatedEvent} event was not called`
      );
    });
    it("should make a call to the UI#rollingDice", () => {
      const uiSpy = sinon.spy();
      userInterface.diceRollResults = uiSpy;
      const diceStub = sinon.stub(Dice, "roll");
      diceStub.returns([1, 2]);

      eventBus.emit(inputEvent);
      expect(uiSpy.calledOnceWithExactly(1, 2)).to.equal(
        true,
        `UI method for display roll results of ${inputEvent} was not called`
      );
    });
    it(`should emit ${continueTurnEvent} event`, () => {
      eventBus.emit(inputEvent);
      expect(continueTurnSpy.callCount).to.equal(
        1,
        `${continueTurnEvent} event was not called`
      );
    });
    it(`should emit ${moveRollEvent} event if player is not in jail`, () => {
      eventBus.emit(inputEvent);
      expect(moveRollSpy.callCount).to.equal(
        1,
        `${moveRollEvent} event was not called`
      );
    });
    it(`should emit ${jailRollEvent} event if player in jail`, () => {
      gameState.currentPlayer.jailed = 0;
      eventBus.emit(inputEvent);
      expect(jailRollSpy.callCount).to.equal(
        1,
        `${jailRollEvent} event was not called`
      );
    });
  });
});
