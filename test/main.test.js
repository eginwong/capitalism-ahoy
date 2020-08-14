// integration tests
const expect = require('chai').expect;
const sinon = require('sinon');
const EventEmitter = require('events');
const { GameState } = require('../entities/GameState');
const { createPlayer } = require('./testutils');
const mockUIFactory = require('./mocks/UI');
const Dice = require('../entities/Components/Dice');
const PlayerActions = require('../entities/PlayerActions');
const config = require('../config/monopolyConfiguration');
const { cloneDeep } = require('lodash');

function gwt(strings) {
  const statements = strings.raw[0].split(' | ');
  return `GIVEN ${statements[0]} WHEN ${statements[1]} THEN ${statements[2]}`;
}

// write an integration test framework for json

// given when then {P}C{Q}
describe('main', () => {
  describe('feature: starts', () => {
    let gameState;
    let userInterface;
    let eventBus;

    beforeEach(() => {
      gameState = new GameState();
      gameState.players = [
        createPlayer({ name: 'player1' }),
        createPlayer({ name: 'player2' }),
      ];
      gameState.config = cloneDeep(config);
      userInterface = mockUIFactory();
      eventBus = new EventEmitter();
    });

    afterEach(() => {
      // Restore the default sandbox here
      sinon.restore();
    });

    it(
      gwt`cold start | game is loaded | first player rolls dice, buys properties, and ends turn`,
      () => {
        // arrange
        const promptStub = sinon.stub(PlayerActions, 'prompt');
        // highest rolling player
        promptStub.onCall(0).returns('');
        promptStub.onCall(1).returns('');
        // player turn
        promptStub.onCall(2).returns('ROLL_DICE');
        promptStub.onCall(3).returns('BUY_PROPERTY');
        promptStub.onCall(4).returns('ROLL_DICE');
        promptStub.onCall(5).returns('BUY_PROPERTY');
        promptStub.onCall(6).returns('END_TURN');
        promptStub.onCall(7).returns('END_GAME');
        const startGameSpy = sinon.spy();
        userInterface.startGame = startGameSpy;
        userInterface.prompt = promptStub;

        const diceStub = sinon.stub(Dice, 'roll');
        // highest rolling player
        diceStub.onCall(0).returns([6]);
        diceStub.onCall(1).returns([1]);

        // player turn
        diceStub.onCall(2).returns([3, 3]);
        diceStub.onCall(3).returns([1, 2]);

        require('../entities/Game')({
          eventBus,
          userInterface,
          gameState,
        });

        expect(startGameSpy.callCount).to.equal(1, 'Game did not start');
        expect(gameState.turn).equal(1, 'Incorrect turn value');
        expect(gameState.players[0].position).to.equal(
          9,
          'Player #1 did not move'
        );
        expect(gameState.players[0].assets).to.equal(
          220,
          "Player #1's assets did not increase"
        );
        expect(gameState.players[0].cash).to.equal(
          1280,
          "Player #1's cash did not decrease"
        );
        expect(gameState.players[1].position).to.equal(0, 'Player #2 moved');
      }
    );

    it(gwt`cold start | game is loaded | player caught speeding`, () => {
      // continue or start
    });

    it(
      gwt`cold start | game is loaded | player paying fine to get out of jail`,
      () => {
        // continue or start
      }
    );

    it(
      gwt`cold start | game is loaded | player paying fine to get out of jail after exhausting three turns`,
      () => {
        // continue or start
      }
    );
  });
});
