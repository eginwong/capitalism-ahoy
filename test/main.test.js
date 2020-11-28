// integration tests
const expect = require('chai').expect;
const sinon = require('sinon');
const EventEmitter = require('events');
const { GameState } = require('../entities/GameState');
const {
  createPlayerFactory,
  fillStub,
  createMonopoly,
  getCommunityChestCard,
  getChanceCard,
} = require('./testutils');
const mockUIFactory = require('./mocks/UI');
const Dice = require('../entities/Components/Dice');
const Deck = require('../entities/Components/Deck');
const PlayerActions = require('../entities/PlayerActions');
const config = require('../config/monopolyConfiguration');
const { cloneDeep } = require('lodash');
const { findById } = require('../entities/helpers');

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

    // re-usable constants
    let startingCash;

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

      startingCash = gameState.players[0].cash;
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
        const promptSelectStub = sinon.stub(PlayerActions, 'select');

        const promptStubValues = [
          '', // highest rolling player
          '',
        ];

        const promptSelectStubValues = [
          'ROLL_DICE',
          'BUY_PROPERTY',
          'ROLL_DICE',
          'BUY_PROPERTY',
          'END_TURN',
          'END_GAME',
        ];
        userInterface.prompt = fillStub(promptStub, promptStubValues);
        userInterface.promptSelect = fillStub(
          promptSelectStub,
          promptSelectStubValues
        );

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
        const promptSelectStub = sinon.stub(PlayerActions, 'select');

        const promptStubValues = [
          '', // highest rolling player
          '',
        ];
        const promptSelectStubValues = [
          'ROLL_DICE',
          'BUY_PROPERTY',
          'END_TURN',
          'ROLL_DICE',
          'END_TURN',
          'END_GAME',
        ];

        userInterface.prompt = fillStub(promptStub, promptStubValues);
        userInterface.promptSelect = fillStub(
          promptSelectStub,
          promptSelectStubValues
        );

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
        const promptSelectStub = sinon.stub(PlayerActions, 'select');

        const promptStubValues = [
          '', // highest rolling player
          '',
        ];

        const boardwalkProp = findById(
          gameState.config.propertyConfig.properties,
          'boardwalk'
        );
        const parkPlaceProp = findById(
          gameState.config.propertyConfig.properties,
          'parkplace'
        );

        const promptSelectStubValues = [
          'ROLL_DICE',
          'BUY_PROPERTY',
          'ROLL_DICE',
          'BUY_PROPERTY',
          'MANAGE_PROPERTIES',
          'RENOVATE',
          boardwalkProp,
          parkPlaceProp,
          boardwalkProp,
          'CANCEL',
          'CANCEL',
          'END_TURN',
          'ROLL_DICE',
          'END_TURN',
          'END_GAME',
        ];

        userInterface.prompt = fillStub(promptStub, promptStubValues);
        userInterface.promptSelect = fillStub(
          promptSelectStub,
          promptSelectStubValues
        );

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
          startingCash - 350 - 400 - 200 - 200 - 200 + 600,
          "Player #1's cash did not change from purchase, renovating, and rental income"
        );
        expect(gameState.players[0].assets).to.equal(
          350 + 400 + 200 + 200 + 200,
          "Player #1's assets did not change from purchase and renovating"
        );
        expect(gameState.players[1].cash).to.equal(
          startingCash - 600,
          "Player #2's cash did not change from rental payment"
        );
      }
    );

    it(
      gwt`cold start | game is loaded | player pays fine to get out of jail, can roll doubles and continue turn`,
      () => {
        // arrange
        const promptStub = sinon.stub(PlayerActions, 'prompt');
        const promptSelectStub = sinon.stub(PlayerActions, 'select');

        const promptStubValues = [
          '', // highest rolling player
          '',
        ];
        const promptSelectStubValues = [
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
        userInterface.promptSelect = fillStub(
          promptSelectStub,
          promptSelectStubValues
        );

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

        const expectedCard = getChanceCard(gameState, 'getoutofjailfree');
        const deckDrawStub = sinon.stub(Deck, 'draw');
        deckDrawStub.returns({ card: expectedCard, deck: [] });

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
          startingCash -
            config.fineAmount -
            expectedFinalBoardProperty.price -
            config.incomeTaxAmount,
          "Player #1's cash does not account for fine, property purchase, and income tax"
        );
      }
    );

    // TODO: hot start
    it(
      gwt`cold start | game is loaded | player uses get out of jail card to get out of jail, can roll doubles and continue turn`,
      () => {
        // arrange
        const promptStub = sinon.stub(PlayerActions, 'prompt');
        const promptSelectStub = sinon.stub(PlayerActions, 'select');

        const promptStubValues = [
          '', // highest rolling player
          '',
        ];
        const promptSelectStubValues = [
          'ROLL_DICE',
          'ROLL_DICE',
          'FIXED',
          'ROLL_DICE',
          'ROLL_DICE', // p2
          'FIXED',
          'END_TURN',
          'USE_GET_OUT_OF_JAIL_FREE_CARD', // p1
          'ROLL_DICE',
          'BUY_PROPERTY',
          'ROLL_DICE',
          'END_GAME',
        ];

        userInterface.prompt = fillStub(promptStub, promptStubValues);
        userInterface.promptSelect = fillStub(
          promptSelectStub,
          promptSelectStubValues
        );

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

        const expectedCommunityChestCard = getCommunityChestCard(
          gameState,
          'getoutofjailfree'
        );
        const expectedChanceCard = getChanceCard(gameState, 'getoutofjailfree');

        const deckDrawStub = sinon.stub(Deck, 'draw');
        deckDrawStub
          .onCall(0)
          .returns({ card: expectedCommunityChestCard, deck: [] });
        deckDrawStub.onCall(1).returns({ card: expectedChanceCard, deck: [] });

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
          startingCash -
            expectedFinalBoardProperty.price -
            config.incomeTaxAmount,
          "Player #1's cash does not account for property purchase and income tax"
        );
      }
    );

    // TODO: hot start
    it(
      gwt`cold start | game is loaded | player pays variable income tax`,
      () => {
        // arrange
        const promptStub = sinon.stub(PlayerActions, 'prompt');
        const promptSelectStub = sinon.stub(PlayerActions, 'select');

        const promptStubValues = [
          '', // highest rolling player
          '',
        ];
        const promptSelectStubValues = ['ROLL_DICE', 'VARIABLE', 'END_GAME'];

        userInterface.prompt = fillStub(promptStub, promptStubValues);
        userInterface.promptSelect = fillStub(
          promptSelectStub,
          promptSelectStubValues
        );

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
          startingCash - config.incomeTaxRate * startingCash,
          "Player #1's cash does not account for variable income tax"
        );
      }
    );

    it(
      gwt`cold start | game is loaded | player rolls doubles, gets out of jail, and does not continue turn`,
      () => {
        // arrange
        const promptStub = sinon.stub(PlayerActions, 'prompt');
        const promptSelectStub = sinon.stub(PlayerActions, 'select');

        const promptStubValues = [
          '', // highest rolling player
          '',
        ];
        const promptSelectStubValues = [
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
        userInterface.promptSelect = fillStub(
          promptSelectStub,
          promptSelectStubValues
        );

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

        const expectedCard = gameState.config.chanceConfig.availableCards.find(
          (c) => c.action === 'addfunds' && c.title.includes('$50')
        );
        const deckDrawStub = sinon.stub(Deck, 'draw');
        deckDrawStub.returns({ card: expectedCard, deck: [] });

        require('../entities/Game')({
          eventBus,
          userInterface,
          gameState,
        });

        expect(gameState.turn).equal(3, 'Incorrect turn value');
        expect(gameState.players[0].cash).to.equal(
          1350 + 50 - config.incomeTaxAmount,
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
        const promptSelectStub = sinon.stub(PlayerActions, 'select');

        const promptStubValues = [
          '', // highest rolling player
          '',
        ];
        const promptSelectStubValues = [
          'ROLL_DICE',
          'ROLL_DICE',
          'ROLL_DICE',
          'END_GAME',
        ];

        userInterface.prompt = fillStub(promptStub, promptStubValues);
        userInterface.promptSelect = fillStub(
          promptSelectStub,
          promptSelectStubValues
        );

        const diceStub = sinon.stub(Dice, 'roll');
        const diceStubValues = [
          [6],
          [1],
          [1, 1], // p1: chance
          [1, 1], // p1: luxury tax
          [4, 4], // p1: speeding
        ];
        fillStub(diceStub, diceStubValues);

        const expectedCard = getChanceCard(gameState, 'getoutofjailfree');
        const deckDrawStub = sinon.stub(Deck, 'draw');
        deckDrawStub.returns({ card: expectedCard, deck: [] });

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
          startingCash - config.luxuryTaxAmount,
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
        const promptSelectStub = sinon.stub(PlayerActions, 'select');

        // highest rolling player
        promptStub.onCall(0).returns('');
        promptStub.onCall(1).returns('');
        // // player turn
        promptSelectStub.onCall(2).returns('ROLL_DICE');
        promptSelectStub.onCall(3).returns('END_GAME');
        userInterface.prompt = promptStub;
        userInterface.promptSelect = promptSelectStub;

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
        const promptSelectStub = sinon.stub(PlayerActions, 'select');

        const promptStubValues = [
          '', // highest rolling player
          '',
        ];
        const promptSelectStubValues = ['ROLL_DICE', 'END_GAME'];
        userInterface.prompt = fillStub(promptStub, promptStubValues);
        userInterface.promptSelect = fillStub(
          promptSelectStub,
          promptSelectStubValues
        );

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
        const promptSelectStub = sinon.stub(PlayerActions, 'select');

        const promptStubValues = [
          '', // highest rolling player
          '',
        ];

        const mediterraneanAveProp = findById(
          gameState.config.propertyConfig.properties,
          'mediterraneanave'
        );

        const promptSelectStubValues = [
          'PAY_FINE',
          'MANAGE_PROPERTIES',
          'MORTGAGE',
          mediterraneanAveProp,
          'CANCEL',
          'CANCEL',
          'CANCEL',
          'END_GAME',
        ];

        userInterface.prompt = fillStub(promptStub, promptStubValues);
        userInterface.promptSelect = fillStub(
          promptSelectStub,
          promptSelectStubValues
        );

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

    // TODO: hot start
    it(gwt`cold start | game is loaded | player auctions a property`, () => {
      // arrange
      const promptStub = sinon.stub(PlayerActions, 'prompt');
      const promptNumberStub = sinon.stub(PlayerActions, 'numberPrompt');
      const promptSelectStub = sinon.stub(PlayerActions, 'select');

      const promptStubValues = [
        '', // highest rolling player
        '',
      ];
      const promptSelectStubValues = [
        'ROLL_DICE',
        'AUCTION',
        // prompt number stub values
        'END_GAME',
      ];
      const promptNumberStubValues = ['30', '50', '40', ''];
      userInterface.prompt = fillStub(promptStub, promptStubValues);
      userInterface.promptNumber = fillStub(
        promptNumberStub,
        promptNumberStubValues
      );
      userInterface.promptSelect = fillStub(
        promptSelectStub,
        promptSelectStubValues
      );

      const diceStub = sinon.stub(Dice, 'roll');
      const diceStubValues = [[6], [1], [1, 2]];
      fillStub(diceStub, diceStubValues);

      require('../entities/Game')({
        eventBus,
        userInterface,
        gameState,
      });

      expect(gameState.players[0].cash).to.equal(
        startingCash,
        "Player #1's cash was incorrectly deducted after losing the auction"
      );
      expect(gameState.players[1].cash).to.equal(
        startingCash - 50,
        "Player #2's cash was not correctly deducted after winning the auction"
      );
      expect(gameState.players[1].assets).to.equal(
        60,
        "Player #2's assets were not correctly added after winning the auction"
      );
    });

    // TODO: hot start
    it(
      gwt`cold start | game is loaded | player auctions a property that requires liquidation`,
      () => {
        // arrange
        const promptStub = sinon.stub(PlayerActions, 'prompt');
        const promptSelectStub = sinon.stub(PlayerActions, 'select');
        const promptNumberStub = sinon.stub(PlayerActions, 'numberPrompt');

        const promptStubValues = [
          '', // highest rolling player
          '',
        ];

        const orientalAveProp = findById(
          gameState.config.propertyConfig.properties,
          'orientalave'
        );

        const promptSelectStubValues = [
          'ROLL_DICE',
          'AUCTION',
          'MANAGE_PROPERTIES',
          'MORTGAGE',
          orientalAveProp,
          'CANCEL',
          'CANCEL',
          'CANCEL',
          'END_GAME',
        ];
        const promptNumberStubValues = ['30', '50', '40', ''];
        userInterface.prompt = fillStub(promptStub, promptStubValues);
        userInterface.promptSelect = fillStub(
          promptSelectStub,
          promptSelectStubValues
        );
        userInterface.promptNumber = fillStub(
          promptNumberStub,
          promptNumberStubValues
        );

        const diceStub = sinon.stub(Dice, 'roll');
        const diceStubValues = [[6], [1], [1, 2]];
        fillStub(diceStub, diceStubValues);

        const orientalAve = findById(
          gameState.config.propertyConfig.properties,
          'orientalave'
        );
        orientalAve.ownedBy = gameState.players[1].id;
        gameState.players[1].cash = 40;
        gameState.players[1].assets = orientalAve.price;

        require('../entities/Game')({
          eventBus,
          userInterface,
          gameState,
        });

        expect(gameState.players[0].cash).to.equal(
          startingCash,
          "Player #1's cash was incorrectly deducted after losing the auction"
        );
        expect(gameState.players[1].cash).to.equal(
          40,
          "Player #2's cash was not correctly deducted after winning the auction"
        );
        expect(gameState.players[1].assets).to.equal(
          60 +
            orientalAve.price /
              gameState.config.propertyConfig.mortgageValueMultiplier,
          "Player #2's assets were not correctly added after winning the auction"
        );
      }
    );

    // TODO: hot start
    it(gwt`cold start | game is loaded | player unmortgages a property`, () => {
      // arrange
      const promptStub = sinon.stub(PlayerActions, 'prompt');
      const promptSelectStub = sinon.stub(PlayerActions, 'select');

      const promptStubValues = [
        '', // highest rolling player
        '',
      ];

      const orientalAveProp = findById(
        gameState.config.propertyConfig.properties,
        'orientalave'
      );

      const promptSelectStubValues = [
        'ROLL_DICE',
        'BUY_PROPERTY',
        'END_TURN',
        'ROLL_DICE', // p2
        'BUY_PROPERTY',
        'MANAGE_PROPERTIES',
        'UNMORTGAGE',
        orientalAveProp,
        'CANCEL',
        'CANCEL',
        'CANCEL',
        'END_GAME',
      ];
      userInterface.prompt = fillStub(promptStub, promptStubValues);
      userInterface.promptSelect = fillStub(
        promptSelectStub,
        promptSelectStubValues
      );

      const diceStub = sinon.stub(Dice, 'roll');
      const diceStubValues = [[6], [1], [1, 2], [1, 4]];
      fillStub(diceStub, diceStubValues);

      const orientalAve = findById(
        gameState.config.propertyConfig.properties,
        'orientalave'
      );
      orientalAve.ownedBy = gameState.players[1].id;
      orientalAve.mortgaged = true;
      gameState.players[1].assets =
        orientalAve.price /
        gameState.config.propertyConfig.mortgageValueMultiplier;
      const railRoad = findById(
        gameState.config.propertyConfig.properties,
        'readingrailroad'
      );

      require('../entities/Game')({
        eventBus,
        userInterface,
        gameState,
      });

      expect(gameState.players[1].cash).to.equal(
        startingCash -
          railRoad.price -
          (orientalAve.price /
            gameState.config.propertyConfig.mortgageValueMultiplier) *
            (1 + gameState.config.propertyConfig.interestRate),
        "Player #2's cash was not correctly deducted after buying the railroad and unmortgaging property"
      );
      expect(gameState.players[1].assets).to.equal(
        orientalAve.price + railRoad.price,
        "Player #2's assets were not correctly added after unmortgage"
      );
    });

    // TODO: hot start
    it(
      gwt`cold start | game is loaded | player pays rent and goes bankrupt, game over`,
      () => {
        // arrange
        const promptStub = sinon.stub(PlayerActions, 'prompt');
        const promptSelectStub = sinon.stub(PlayerActions, 'select');

        const promptStubValues = [
          '', // highest rolling player
          '',
        ];

        const boardwalkProp = findById(
          gameState.config.propertyConfig.properties,
          'boardwalk'
        );
        const parkPlaceProp = findById(
          gameState.config.propertyConfig.properties,
          'parkplace'
        );

        const promptSelectStubValues = [
          'ROLL_DICE',
          'BUY_PROPERTY',
          'ROLL_DICE',
          'BUY_PROPERTY',
          'MANAGE_PROPERTIES',
          'RENOVATE',
          boardwalkProp,
          parkPlaceProp,
          boardwalkProp,
          'CANCEL',
          'CANCEL',
          'END_TURN',
          'ROLL_DICE',
          '',
        ];
        userInterface.prompt = fillStub(promptStub, promptStubValues);
        userInterface.promptSelect = fillStub(
          promptSelectStub,
          promptSelectStubValues
        );
        const uiSpy = sinon.spy();
        userInterface.gameOver = uiSpy;

        const diceStub = sinon.stub(Dice, 'roll');
        const diceStubValues = [[6], [1], [2, 2], [1, 1], [2, 3]];
        fillStub(diceStub, diceStubValues);

        userInterface.prompt = promptStub;

        // preload starting point
        gameState.players[0].position = 33;
        gameState.players[1].position = 34;
        gameState.players[1].cash = 500;

        require('../entities/Game')({
          eventBus,
          userInterface,
          gameState,
        });

        const player0Cash = startingCash - 350 - 400 - 200 - 200 - 200 + 500;
        const player0Assets = 350 + 400 + 200 + 200 + 200;

        expect(gameState.players[0].cash).to.equal(
          player0Cash,
          "Player #1's cash did not change from purchase, renovating, and rental income, with limited amount of rent"
        );
        expect(gameState.players[0].assets).to.equal(
          player0Assets,
          "Player #1's assets did not change from purchase and renovating"
        );
        expect(gameState.players[1].cash).to.equal(
          0,
          "Player #2's cash did not change from rental payment"
        );
        expect(gameState.players[1].bankrupt).to.equal(
          true,
          'Player #2 is not bankrupt'
        );
        expect(gameState.gameOver).to.equal(
          true,
          'Game is not over although only one player left playing'
        );
        expect(
          uiSpy.calledOnceWithExactly(
            gameState.players[0].name,
            player0Assets + player0Cash
          )
        ).to.equal(
          true,
          'Player #1 did not win correctly after Player #2 went bankrupt'
        );
      }
    );

    // TODO: hot start
    it(
      gwt`cold start | game is loaded | other player pays community chest and goes bankrupt, game over short circuit`,
      () => {
        // arrange
        const promptStub = sinon.stub(PlayerActions, 'prompt');
        const promptSelectStub = sinon.stub(PlayerActions, 'select');

        const promptStubValues = [
          '', // highest rolling player
          '',
        ];
        const promptSelectStubValues = ['ROLL_DICE', ''];
        userInterface.prompt = fillStub(promptStub, promptStubValues);
        userInterface.promptSelect = fillStub(
          promptSelectStub,
          promptSelectStubValues
        );
        const uiSpy = sinon.spy();
        userInterface.gameOver = uiSpy;

        const diceStub = sinon.stub(Dice, 'roll');
        const diceStubValues = [[6], [1], [1, 1]];
        fillStub(diceStub, diceStubValues);
        const expectedCommunityChestCard = getCommunityChestCard(
          gameState,
          'addfundsfromplayers'
        );
        const deckDrawStub = sinon.stub(Deck, 'draw');
        deckDrawStub
          .onCall(0)
          .returns({ card: expectedCommunityChestCard, deck: [] });

        userInterface.prompt = promptStub;

        // preload starting point
        gameState.players[1].cash = 40;

        require('../entities/Game')({
          eventBus,
          userInterface,
          gameState,
        });

        expect(gameState.players[0].cash).to.equal(
          startingCash + 40,
          "Player #1's cash did not change from community chest card"
        );
        expect(gameState.players[1].cash).to.equal(
          0,
          "Player #2's cash did not change from community chest card"
        );
        expect(gameState.players[1].bankrupt).to.equal(
          true,
          'Player #2 is not bankrupt'
        );
      }
    );

    // TODO: hot start
    it(
      gwt`cold start | game is loaded | player pays chance card and goes bankrupt, game over`,
      () => {
        // arrange
        const promptStub = sinon.stub(PlayerActions, 'prompt');
        const promptSelectStub = sinon.stub(PlayerActions, 'select');

        const promptStubValues = [
          '', // highest rolling player
          '',
        ];
        const promptSelectStubValues = ['ROLL_DICE', ''];
        userInterface.prompt = fillStub(promptStub, promptStubValues);
        userInterface.promptSelect = fillStub(
          promptSelectStub,
          promptSelectStubValues
        );
        const uiSpy = sinon.spy();
        userInterface.gameOver = uiSpy;

        const diceStub = sinon.stub(Dice, 'roll');
        const diceStubValues = [[6], [1], [3, 4]];
        fillStub(diceStub, diceStubValues);
        const expectedChanceCard = getChanceCard(
          gameState,
          'removefundstoplayers'
        );
        const deckDrawStub = sinon.stub(Deck, 'draw');
        deckDrawStub.onCall(0).returns({ card: expectedChanceCard, deck: [] });

        userInterface.prompt = promptStub;

        // preload starting point
        gameState.players[0].cash = 40;

        require('../entities/Game')({
          eventBus,
          userInterface,
          gameState,
        });

        expect(gameState.players[0].cash).to.equal(
          0,
          "Player #1's cash did not change from chance card"
        );
        expect(gameState.players[1].cash).to.equal(
          startingCash + 40,
          "Player #2's cash did not change from chance card"
        );
        expect(gameState.players[0].bankrupt).to.equal(
          true,
          'Player #1 is not bankrupt'
        );
      }
    );

    // TODO: hot start
    it(
      gwt`cold start | game is loaded | player pays rent and goes bankrupt with properties, cards, and auction, game over`,
      () => {
        // arrange
        const promptStub = sinon.stub(PlayerActions, 'prompt');
        const promptSelectStub = sinon.stub(PlayerActions, 'select');

        const promptStubValues = [
          '', // highest rolling player
          '',
        ];

        const boardwalkProp = findById(
          gameState.config.propertyConfig.properties,
          'boardwalk'
        );
        const parkPlaceProp = findById(
          gameState.config.propertyConfig.properties,
          'parkplace'
        );

        const promptSelectStubValues = [
          'ROLL_DICE',
          'BUY_PROPERTY',
          'ROLL_DICE',
          'BUY_PROPERTY',
          'MANAGE_PROPERTIES',
          'RENOVATE',
          boardwalkProp,
          parkPlaceProp,
          boardwalkProp,
          'CANCEL',
          'CANCEL',
          'END_TURN',
          'ROLL_DICE',
          '',
        ];
        userInterface.prompt = fillStub(promptStub, promptStubValues);
        userInterface.promptSelect = fillStub(
          promptSelectStub,
          promptSelectStubValues
        );
        const uiSpy = sinon.spy();
        userInterface.gameOver = uiSpy;

        const diceStub = sinon.stub(Dice, 'roll');
        const diceStubValues = [[6], [1], [2, 2], [1, 1], [2, 3]];
        fillStub(diceStub, diceStubValues);
        const communityChestCard = getCommunityChestCard(
          gameState,
          'getoutofjailfree'
        );

        userInterface.prompt = promptStub;

        // preload starting point
        gameState.players[0].position = 33;
        gameState.players[1].position = 34;
        gameState.players[1].cash = 500;
        gameState.players[1].cards.push(communityChestCard);
        const purpleGroup = 'Purple';
        createMonopoly(gameState, purpleGroup, gameState.players[1].id);
        const {
          mortgageValueMultiplier,
          properties,
        } = gameState.config.propertyConfig;
        const purpleProperties = properties.filter(
          (p) => p.group === purpleGroup
        );
        purpleProperties[0].buildings = 1;
        purpleProperties[1].mortgaged = true;

        require('../entities/Game')({
          eventBus,
          userInterface,
          gameState,
        });

        const player0Cash =
          startingCash -
          350 -
          400 -
          200 -
          200 -
          200 +
          500 +
          purpleProperties[0].houseCost / mortgageValueMultiplier +
          purpleProperties[0].price / mortgageValueMultiplier;

        expect(gameState.players[0].cash).to.equal(
          player0Cash,
          "Player #1's cash did not change from purchase, renovating, and rental income, with limited amount of rent"
        );
        expect(gameState.players[1].cash).to.equal(
          0,
          "Player #2's cash did not change from rental payment"
        );
        expect(gameState.players[1].bankrupt).to.equal(
          true,
          'Player #2 is not bankrupt'
        );
        expect(gameState.players[1].cards).to.deep.equal(
          [],
          'Player #2 has remaining cards after bankruptcy'
        );
      }
    );

    // TODO: hot start
    it(
      gwt`cold start | game is loaded | player trades properties with cards and cash, interest calculated correctly`,
      () => {
        // arrange
        const promptStub = sinon.stub(PlayerActions, 'prompt');
        const promptSelectStub = sinon.stub(PlayerActions, 'select');
        const tradeStub = sinon.stub(PlayerActions, 'trade');
        const {
          properties,
          mortgageValueMultiplier,
          interestRate,
        } = gameState.config.propertyConfig;

        const promptStubValues = [
          '', // highest rolling player
          '',
        ];

        const orientalAveProp = findById(properties, 'orientalave');
        const balticAveProp = findById(properties, 'balticave');

        const promptSelectStubValues = [
          'ROLL_DICE', // community chest
          'ROLL_DICE',
          'BUY_PROPERTY', // oriental ave
          'MANAGE_PROPERTIES',
          'MORTGAGE',
          orientalAveProp,
          'CANCEL',
          'CANCEL',
          'CANCEL',
          'END_TURN',
          'ROLL_DICE', // p2
          'BUY_PROPERTY', // baltic ave
          'TRADE',
          'END_GAME',
        ];
        userInterface.prompt = fillStub(promptStub, promptStubValues);
        userInterface.promptSelect = fillStub(
          promptSelectStub,
          promptSelectStubValues
        );
        const diceStub = sinon.stub(Dice, 'roll');
        const diceStubValues = [[6], [1], [1, 1], [1, 3], [1, 2]];
        fillStub(diceStub, diceStubValues);
        const communityChestCard = getCommunityChestCard(
          gameState,
          'getoutofjailfree'
        );
        const deckDrawStub = sinon.stub(Deck, 'draw');
        deckDrawStub.returns({ card: communityChestCard, deck: [] });
        const cashDeal = 300;
        tradeStub.returns({
          0: [balticAveProp, cashDeal],
          1: [communityChestCard, orientalAveProp],
          status: require('../entities/TradeService').TradeStatus.ACCEPT,
        });

        require('../entities/Game')({
          eventBus,
          userInterface,
          gameState,
        });

        // player 2 gets card + property + mortgage, and unmortgages on receive
        // player 1 gets property,
        // player 2 starts trade
        // ensure interest and properties are correctly swapped

        expect(gameState.players[0].cards).to.deep.equal(
          [],
          `Player #1's cards were not traded as expected`
        );
        expect(gameState.players[0].cash).to.equal(
          startingCash -
            orientalAveProp.price / mortgageValueMultiplier +
            cashDeal
        );
        expect(gameState.players[0].assets).to.equal(
          balticAveProp.price,
          "Player #1's assets were not correctly added after trade"
        );
        expect(gameState.players[1].cards).to.deep.equal(
          [communityChestCard],
          `Player #2's cards were not traded as expected`
        );
        expect(gameState.players[1].cash).to.equal(
          startingCash -
            balticAveProp.price -
            (orientalAveProp.price / mortgageValueMultiplier) * interestRate -
            cashDeal -
            orientalAveProp.price / mortgageValueMultiplier,
          "Player #2's cash was not correctly deducted after purchase, trade with interest, and then unmortgaging property"
        );
        expect(gameState.players[1].assets).to.equal(
          orientalAveProp.price,
          "Player #2's assets were not correctly added after trade"
        );
      }
    );
  });
});
