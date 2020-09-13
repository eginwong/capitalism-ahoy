// integration tests
const expect = require('chai').expect;
const sinon = require('sinon');
const EventEmitter = require('events');
const { GameState } = require('../entities/GameState');
const {
  createPlayerFactory,
  fillStub,
  createMonopoly,
} = require('./testutils');
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
      let createPlayer = createPlayerFactory();
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
        const promptStubValues = [
          '', // highest rolling player
          '',
          'ROLL_DICE',
          'BUY_PROPERTY',
          'ROLL_DICE',
          'BUY_PROPERTY',
          'END_TURN',
          'END_GAME',
        ];
        userInterface.prompt = fillStub(promptStub, promptStubValues);

        const diceStub = sinon.stub(Dice, 'roll');
        const diceStubValues = [[6], [1], [3, 3], [1, 2]];
        fillStub(diceStub, diceStubValues);

        const startGameSpy = sinon.spy();
        userInterface.startGame = startGameSpy;
        userInterface.prompt = promptStub;

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

    it(
      gwt`cold start | game is loaded | first player buys properties, and second player pays rent`,
      () => {
        // arrange
        const promptStub = sinon.stub(PlayerActions, 'prompt');
        const promptStubValues = [
          '', // highest rolling player
          '',
          'ROLL_DICE',
          'BUY_PROPERTY',
          'END_TURN',
          'ROLL_DICE',
          'END_TURN',
          'END_GAME',
        ];
        userInterface.prompt = fillStub(promptStub, promptStubValues);

        const diceStub = sinon.stub(Dice, 'roll');
        const diceStubValues = [[6], [1], [1, 2], [1, 2]];
        fillStub(diceStub, diceStubValues);

        userInterface.prompt = promptStub;

        require('../entities/Game')({
          eventBus,
          userInterface,
          gameState,
        });

        expect(gameState.turn).equal(2, 'Incorrect turn value');
        expect(gameState.players[0].cash).to.equal(
          1444,
          "Player #1's cash did not change from purchase and rental income"
        );
        expect(gameState.players[1].cash).to.equal(
          1496,
          "Player #2's cash did not change from rental payment"
        );
      }
    );

    // TODO: hot start
    it(
      gwt`cold start | game is loaded | first player buys properties, manages properties, and second player pays rent`,
      () => {
        // arrange
        const promptStub = sinon.stub(PlayerActions, 'prompt');
        const promptStubValues = [
          '', // highest rolling player
          '',
          'ROLL_DICE',
          'BUY_PROPERTY',
          'ROLL_DICE',
          'BUY_PROPERTY',
          'MANAGE_PROPERTIES',
          'RENOVATE',
          'Boardwalk',
          'Park Place',
          'Boardwalk',
          'CANCEL',
          'CANCEL',
          'END_TURN',
          'ROLL_DICE',
          'END_TURN',
          'END_GAME',
        ];
        userInterface.prompt = fillStub(promptStub, promptStubValues);

        const diceStub = sinon.stub(Dice, 'roll');
        const diceStubValues = [[6], [1], [2, 2], [1, 1], [2, 3]];
        fillStub(diceStub, diceStubValues);

        userInterface.prompt = promptStub;

        // preload starting point
        gameState.players[0].position = 33;
        gameState.players[1].position = 34;

        require('../entities/Game')({
          eventBus,
          userInterface,
          gameState,
        });

        expect(gameState.turn).equal(2, 'Incorrect turn value');
        expect(gameState.players[0].cash).to.equal(
          1500 - 350 - 400 - 200 - 200 - 200 + 600,
          "Player #1's cash did not change from purchase, renovating, and rental income"
        );
        expect(gameState.players[0].assets).to.equal(
          350 + 400 + 200 + 200 + 200,
          "Player #1's assets did not change from purchase and renovating"
        );
        expect(gameState.players[1].cash).to.equal(
          1500 - 600,
          "Player #2's cash did not change from rental payment"
        );
      }
    );

    // TODO: mortgage scenario
    xit(
      gwt`cold start | game is loaded | player must mortgage property to survive liquidation`,
      () => {}
    );

    it(gwt`cold start | game is loaded | player caught speeding`, () => {
      // arrange
      const promptStub = sinon.stub(PlayerActions, 'prompt');
      const promptStubValues = [
        '', // highest rolling player
        '',
        'ROLL_DICE',
        'ROLL_DICE',
        'FIXED',
        'ROLL_DICE',
        'END_GAME',
      ];
      userInterface.prompt = fillStub(promptStub, promptStubValues);

      const diceStub = sinon.stub(Dice, 'roll');
      const diceStubValues = [
        [6],
        [1],
        [1, 1], // p1: community chest
        [1, 1], // p1: income tax
        [4, 4], // p1: speeding
      ];
      fillStub(diceStub, diceStubValues);

      require('../entities/Game')({
        eventBus,
        userInterface,
        gameState,
      });

      expect(gameState.turn).equal(1, 'Incorrect turn value');
      expect(gameState.players[0].position).to.equal(
        10,
        'Player #1 did not correctly go to jail for speeding'
      );
      expect(gameState.players[0].jailed).to.equal(
        0,
        "Player #1's jail status was not correctly set"
      );
      expect(gameState.players[0].cash).to.equal(
        1500 - config.incomeTaxAmount,
        "Player #1's cash was not correctly set"
      );
      expect(gameState.players[1].position).to.equal(0, 'Player #2 moved');
    });

    it(
      gwt`cold start | game is loaded | player pays fine to get out of jail, can roll doubles and continue turn`,
      () => {
        // arrange
        const promptStub = sinon.stub(PlayerActions, 'prompt');

        const promptStubValues = [
          '', // highest rolling player
          '',
          'ROLL_DICE',
          'ROLL_DICE',
          'FIXED',
          'ROLL_DICE',
          'ROLL_DICE', // p2
          'FIXED',
          'END_TURN',
          'PAY_FINE', // p1
          'ROLL_DICE',
          'BUY_PROPERTY',
          'ROLL_DICE',
          'END_GAME',
        ];
        userInterface.prompt = fillStub(promptStub, promptStubValues);

        const diceStub = sinon.stub(Dice, 'roll');
        const diceStubValues = [
          [6],
          [1],
          [1, 1], // p1: community chest
          [1, 1], // p1: income tax
          [4, 4], // p1: speeding
          [1, 3], // p2: income tax
          [3, 3], // p1: st james place
          [4, 2], // p1: chance
        ];
        fillStub(diceStub, diceStubValues);

        require('../entities/Game')({
          eventBus,
          userInterface,
          gameState,
        });

        const expectedFinalBoardProperty = {
          position: 22,
          price: 180,
        };
        expect(gameState.turn).equal(2, 'Incorrect turn value');
        expect(gameState.players[0].position).to.equal(
          expectedFinalBoardProperty.position,
          'Player #1 did not correctly move to expected location after rolling doubles'
        );
        expect(gameState.players[0].cash).to.equal(
          1500 -
            config.fineAmount -
            expectedFinalBoardProperty.price -
            config.incomeTaxAmount,
          "Player #1's cash does not account for fine, property purchase, and income tax"
        );
      }
    );

    // TODO: hot start
    it(
      gwt`cold start | game is loaded | player pays fine to get out of jail after exhausting three turns`,
      () => {
        // arrange
        const promptStub = sinon.stub(PlayerActions, 'prompt');

        const promptStubValues = [
          '', // highest rolling player
          '',
          'ROLL_DICE',
          'ROLL_DICE',
          'FIXED',
          'ROLL_DICE',
          'ROLL_DICE', // p2
          'FIXED',
          'END_TURN',
          'ROLL_DICE', // p1
          'END_TURN',
          'ROLL_DICE', // p2
          'END_TURN',
          'ROLL_DICE', // p1
          'END_TURN',
          'ROLL_DICE', // p2
          'END_TURN',
          'ROLL_DICE', // p1
          'END_GAME',
        ];
        userInterface.prompt = fillStub(promptStub, promptStubValues);

        const diceStub = sinon.stub(Dice, 'roll');
        const diceStubValues = [
          [6],
          [1],
          [1, 1], // p1: community chest
          [1, 1], // p1: income tax
          [4, 4], // p1: speeding
          [1, 3], // p2: income tax
          [1, 2], // p1: jail 1
          [1, 2], // p2: chance
          [1, 2], // p1: jail 2
          [1, 2], // p2: visiting jail
          [3, 4], // p2: jail 3, community chest
        ];
        fillStub(diceStub, diceStubValues);

        require('../entities/Game')({
          eventBus,
          userInterface,
          gameState,
        });

        expect(gameState.turn).equal(6, 'Incorrect turn value');
        expect(gameState.players[0].cash).to.equal(
          1500 - config.fineAmount - config.incomeTaxAmount,
          "Player #1's cash does not account for fine, and income tax"
        );
      }
    );

    // TODO: hot start
    it(
      gwt`cold start | game is loaded | player pays variable income tax`,
      () => {
        // arrange
        const promptStub = sinon.stub(PlayerActions, 'prompt');

        const promptStubValues = [
          '', // highest rolling player
          '',
          'ROLL_DICE',
          'VARIABLE',
          'END_GAME',
        ];
        userInterface.prompt = fillStub(promptStub, promptStubValues);

        const diceStub = sinon.stub(Dice, 'roll');
        const diceStubValues = [
          [6],
          [1],
          [1, 3], // p1: income tax
        ];
        fillStub(diceStub, diceStubValues);

        require('../entities/Game')({
          eventBus,
          userInterface,
          gameState,
        });

        expect(gameState.turn).equal(0, 'Incorrect turn value');
        expect(gameState.players[0].cash).to.equal(
          1500 - config.incomeTaxRate * 1500,
          "Player #1's cash does not account for variable income tax"
        );
      }
    );

    it(
      gwt`cold start | game is loaded | player rolls doubles, gets out of jail, and does not continue turn`,
      () => {
        // arrange
        const promptStub = sinon.stub(PlayerActions, 'prompt');

        const promptStubValues = [
          '', // highest rolling player
          '',
          'ROLL_DICE',
          'ROLL_DICE',
          'FIXED',
          'ROLL_DICE',
          'ROLL_DICE', // p2
          'FIXED',
          'END_TURN',
          'ROLL_DICE', // p1
          'BUY_PROPERTY',
          'END_TURN',
          'END_GAME',
        ];
        userInterface.prompt = fillStub(promptStub, promptStubValues);

        const diceStub = sinon.stub(Dice, 'roll');
        const diceStubValues = [
          [6],
          [1],
          [1, 1], // p1: community chest
          [1, 1], // p1: income tax
          [4, 4], // p1: speeding
          [1, 3], // p2: income tax
          [1, 1], // p1: jail 1
        ];
        fillStub(diceStub, diceStubValues);

        require('../entities/Game')({
          eventBus,
          userInterface,
          gameState,
        });

        expect(gameState.turn).equal(3, 'Incorrect turn value');
        expect(gameState.players[0].cash).to.equal(
          1350 - config.incomeTaxAmount,
          "Player #1's cash was incorrectly fined + income tax amount"
        );
        expect(gameState.players[0].position).to.equal(
          12,
          "Player #1's position is incorrect"
        );
      }
    );

    // TODO: hot start
    it(
      gwt`cold start | game is loaded | player does not get GO money when going to jail`,
      () => {
        // arrange
        const promptStub = sinon.stub(PlayerActions, 'prompt');

        const promptStubValues = [
          '', // highest rolling player
          '',
          'ROLL_DICE',
          'ROLL_DICE',
          'ROLL_DICE',
          'END_GAME',
        ];
        userInterface.prompt = fillStub(promptStub, promptStubValues);

        const diceStub = sinon.stub(Dice, 'roll');
        const diceStubValues = [
          [6],
          [1],
          [1, 1], // p1: chance
          [1, 1], // p1: luxury tax
          [4, 4], // p1: speeding
        ];
        fillStub(diceStub, diceStubValues);

        // begin player1 partway through the board
        gameState.players[0].position = 34;

        require('../entities/Game')({
          eventBus,
          userInterface,
          gameState,
        });

        expect(gameState.turn).equal(1, 'Incorrect turn value');
        expect(gameState.players[0].position).to.equal(
          10,
          'Player #1 did not correctly go to jail for speeding'
        );
        expect(gameState.players[0].jailed).to.equal(
          0,
          "Player #1's jail status was not correctly set"
        );
        expect(gameState.players[0].cash).to.equal(
          1500 - config.luxuryTaxAmount,
          "Player #1's incorrectly received GO money while getting caught for speeding"
        );
      }
    );

    // TODO: hot start
    it(
      gwt`cold start | game is loaded | player gains money when passing GO`,
      () => {
        // arrange
        const promptStub = sinon.stub(PlayerActions, 'prompt');
        // highest rolling player
        promptStub.onCall(0).returns('');
        promptStub.onCall(1).returns('');
        // // player turn
        promptStub.onCall(2).returns('ROLL_DICE');
        promptStub.onCall(3).returns('END_GAME');
        userInterface.prompt = promptStub;

        const diceStub = sinon.stub(Dice, 'roll');
        // highest rolling player
        diceStub.onCall(0).returns([6]);
        diceStub.onCall(1).returns([1]);

        // begin player1 partway through the board
        gameState.players[0].position = 29;
        // player turn
        diceStub.onCall(2).returns([6, 5]); // p1: chance

        require('../entities/Game')({
          eventBus,
          userInterface,
          gameState,
        });

        expect(gameState.turn).equal(0, 'Incorrect turn value');
        expect(gameState.players[0].cash).to.equal(
          1700,
          "Player #1's did not receive GO money when going around the board"
        );
      }
    );

    // TODO: hot start
    it(
      gwt`cold start | game is loaded | player goes to jail when landing on Go To Jail`,
      () => {
        // arrange
        const promptStub = sinon.stub(PlayerActions, 'prompt');

        const promptStubValues = [
          '', // highest rolling player
          '',
          'ROLL_DICE',
          'END_GAME',
        ];
        userInterface.prompt = fillStub(promptStub, promptStubValues);

        const diceStub = sinon.stub(Dice, 'roll');
        const diceStubValues = [
          [6],
          [1],
          [6, 5], // p1: chance
        ];
        fillStub(diceStub, diceStubValues);

        // begin player1 partway through the board
        gameState.players[0].position = 19;

        require('../entities/Game')({
          eventBus,
          userInterface,
          gameState,
        });

        expect(gameState.turn).equal(1, 'Incorrect turn value');
        expect(gameState.players[0].position).to.equal(
          10,
          "Player #1's did not go to jail when landing on the Go To Jail property"
        );
      }
    );

    // TODO: hot start
    it(
      gwt`cold start | game is loaded | player needs to liquidate to pay fine from jail`,
      () => {
        // arrange
        const promptStub = sinon.stub(PlayerActions, 'prompt');

        const promptStubValues = [
          '', // highest rolling player
          '',
          'PAY_FINE',
          'MANAGE_PROPERTIES',
          'MORTGAGE',
          'MEDITERRANEAN AVENUE',
          'CANCEL',
          'CANCEL',
          'CANCEL',
          'END_GAME',
        ];
        userInterface.prompt = fillStub(promptStub, promptStubValues);

        const diceStub = sinon.stub(Dice, 'roll');
        const diceStubValues = [[6], [1]];
        fillStub(diceStub, diceStubValues);

        gameState.players[0].jailed = 0;
        gameState.players[0].cash = 20;
        createMonopoly(gameState, 'Purple', gameState.players[0].id);

        require('../entities/Game')({
          eventBus,
          userInterface,
          gameState,
        });

        expect(gameState.turn).equal(0, 'Incorrect turn value');
        expect(gameState.players[0].cash).to.equal(
          0,
          "Player #1's cash was incorrectly fined after mortgaging property"
        );
        expect(gameState.players[0].jailed).to.equal(
          -1,
          "Player #1's jail status is incorrect"
        );
      }
    );
  });
});
