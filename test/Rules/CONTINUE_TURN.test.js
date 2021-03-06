const expect = require('chai').expect;
const EventEmitter = require('events');
const sinon = require('sinon');
const mockUIFactory = require('../mocks/UI');

const { GameState } = require('../../entities/GameState');
const { createPlayerFactory } = require('../testutils');
const PlayerActions = require('../../entities/PlayerActions');
const config = require('../../config/monopolyConfiguration');
const { cloneDeep } = require('lodash');

describe('Rules -> CONTINUE_TURN', () => {
  let gameState;
  let userInterface;
  let eventBus;
  const RULES = require('../../entities/Rules');

  beforeEach(() => {
    gameState = new GameState();
    eventBus = new EventEmitter();
    userInterface = mockUIFactory();
    let createPlayer = createPlayerFactory();
    gameState.players = [createPlayer({ name: 'player1' })];
    gameState.config = cloneDeep(config);
  });

  afterEach(() => {
    // Restore the default sandbox here
    sinon.restore();
  });

  describe('continueTurn', () => {
    const inputEvent = 'CONTINUE_TURN';
    const rollDiceEvent = 'ROLL_DICE';
    const endTurnEvent = 'END_TURN';
    const endGameEvent = 'END_GAME';

    let continueTurnSpy;
    let endTurnSpy;
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
      gameState.turnValues = {
        roll: [1, 2],
      };

      continueTurnSpy = sinon.spy();
      endTurnSpy = sinon.spy();
      rollDiceSpy = sinon.spy();

      eventBus.on(inputEvent, continueTurnSpy);
      eventBus.on(endTurnEvent, endTurnSpy);
      eventBus.on(rollDiceEvent, rollDiceSpy);
    });

    it(`should emit desired ${rollDiceEvent} event`, () => {
      const promptStub = sinon.stub(PlayerActions, 'select');
      promptStub.onCall(0).returns(rollDiceEvent);
      promptStub.onCall(1).returns(endTurnEvent);
      eventBus.emit(inputEvent);
      expect(rollDiceSpy.callCount).to.equal(
        1,
        `${rollDiceEvent} was called ${rollDiceSpy.callCount} times but expected to be 1 times`
      );
    });
    it('should end turn if player is newly in jail', () => {
      gameState.currentPlayer.jailed = 0; // set player to jail
      const promptStub = sinon.stub(PlayerActions, 'select');
      promptStub.onCall(0).returns(rollDiceEvent);
      eventBus.emit(inputEvent);
      expect(continueTurnSpy.callCount).to.equal(
        1,
        `${inputEvent} was called ${continueTurnSpy.callCount} times but expected to be 1 times`
      );
    });
    it(`should not call ${inputEvent} if action is ${endTurnEvent}`, () => {
      const promptStub = sinon.stub(PlayerActions, 'select');
      promptStub.onCall(0).returns(endTurnEvent);
      eventBus.emit(inputEvent);
      expect(continueTurnSpy.callCount).to.equal(
        1,
        `${inputEvent} was called ${continueTurnSpy.callCount} times but expected to be 1 times`
      );
    });
    it(`should not call ${inputEvent} if action is ${endGameEvent}`, () => {
      const promptStub = sinon.stub(PlayerActions, 'select');
      promptStub.onCall(0).returns(endGameEvent);
      eventBus.emit(inputEvent);
      expect(continueTurnSpy.callCount).to.equal(
        1,
        `${inputEvent} was called ${continueTurnSpy.callCount} times but expected to be 1 times`
      );
    });
    it(`should emit ${endTurnEvent} event if game is over`, () => {
      gameState.gameOver = true;
      const promptStub = sinon.stub(PlayerActions, 'select');
      promptStub.onCall(0).returns(rollDiceEvent);

      eventBus.emit(inputEvent);
      expect(continueTurnSpy.callCount).to.equal(
        1,
        `${inputEvent} was called ${continueTurnSpy.callCount} times but expected to be 1 times`
      );
      expect(endTurnSpy.callCount).to.equal(
        1,
        `${endTurnEvent} was called ${endTurnSpy.callCount} times but expected to be 1 times`
      );
    });
    it(`should emit ${endTurnEvent} event if player is bankrupt`, () => {
      gameState.currentPlayer.bankrupt = true;
      const promptStub = sinon.stub(PlayerActions, 'select');
      promptStub.onCall(0).returns(rollDiceEvent);

      eventBus.emit(inputEvent);
      expect(continueTurnSpy.callCount).to.equal(
        1,
        `${inputEvent} was called ${continueTurnSpy.callCount} times but expected to be 1 times`
      );
      expect(endTurnSpy.callCount).to.equal(
        1,
        `${endTurnEvent} was called ${endTurnSpy.callCount} times but expected to be 1 times`
      );
    });
    it(`should not call ${inputEvent} if player is bankrupt`, () => {
      const promptStub = sinon.stub(PlayerActions, 'select');
      promptStub.onCall(0).returns(rollDiceEvent);
      gameState.currentPlayer.bankrupt = true;

      eventBus.emit(inputEvent);
      expect(continueTurnSpy.callCount).to.equal(
        1,
        `${inputEvent} was called ${continueTurnSpy.callCount} times but expected to be 1 times`
      );
    });
  });
});
