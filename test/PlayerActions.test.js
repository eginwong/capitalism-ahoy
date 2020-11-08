const expect = require('chai').expect;
const sinon = require('sinon');
const mockUIFactory = require('./mocks/UI');

const { GameState } = require('../entities/GameState');
const { createPlayerFactory } = require('./testutils');
const PlayerActions = require('../entities/PlayerActions');
const AuctionService = require('../entities/AuctionService');
const config = require('../config/monopolyConfiguration');
const { cloneDeep } = require('lodash');
const { calculateLiquidity } = require('../entities/WealthService');

describe('PlayerActions', () => {
  let gameState;

  beforeEach(() => {
    gameState = new GameState();
    let createPlayer = createPlayerFactory();
    gameState.players = [
      createPlayer({ name: 'player1' }),
      createPlayer({ name: 'player2' }),
      createPlayer({ name: 'player3' }),
    ];
    // simulate start of a turn
    require('../entities/Rules/resetTurnAssociatedValues')({
      speedingCounter: 0,
    })(gameState);
    gameState.config = cloneDeep(config);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('refresh', () => {
    describe('ROLL_DICE', () => {
      it('returns if no dice have been rolled', () => {
        expect(PlayerActions.refresh(gameState)).to.contain(
          'ROLL_DICE',
          'Roll Dice action is unavailable'
        );
      });
      it('returns if speeding counter is greater than zero', () => {
        require('../entities/Rules/updateTurnValues')({
          roll: [1, 2],
          speedingCounter: 1,
        })(gameState);
        expect(PlayerActions.refresh(gameState)).to.contain(
          'ROLL_DICE',
          'Roll Dice action is unavailable'
        );
      });
      it('does not return if dice have been rolled and speeding counter is zero', () => {
        require('../entities/Rules/updateTurnValues')({
          roll: [1, 2],
          speedingCounter: 0,
        })(gameState);
        expect(PlayerActions.refresh(gameState)).not.to.contain(
          'ROLL_DICE',
          'Roll Dice action is available'
        );
      });
    });
    describe('END_TURN', () => {
      it('returns if dice have been rolled and no doubles are rolled', () => {
        require('../entities/Rules/updateTurnValues')({
          roll: [1, 2],
          speedingCounter: 0,
        })(gameState);
        expect(PlayerActions.refresh(gameState)).to.contain(
          'END_TURN',
          'End Turn action is unavailable'
        );
      });
      it('does not return end turn if doubles have been rolled', () => {
        require('../entities/Rules/updateTurnValues')({
          roll: [2, 2],
          speedingCounter: 1,
        })(gameState);
        expect(PlayerActions.refresh(gameState)).not.to.contain(
          'END_TURN',
          'End Turn action is available'
        );
      });
      it('does not return end turn if dice have not been rolled', () => {
        expect(PlayerActions.refresh(gameState)).not.to.contain(
          'END_TURN',
          'End Turn action is available'
        );
      });
    });
    describe('USE_GET_OUT_OF_JAIL_FREE_CARD', () => {
      it('returns if player is in jail and has a card with action getoutofjailfree', () => {
        gameState.currentPlayer.jailed = 0;
        gameState.currentPlayer.cards = [
          gameState.config.chanceConfig.availableCards.find(
            (c) => c.action === 'getoutofjailfree'
          ),
        ];
        expect(PlayerActions.refresh(gameState)).to.contain(
          'USE_GET_OUT_OF_JAIL_FREE_CARD',
          'Get Out of Jail Free action is unavailable'
        );
      });
      it('does not return if player is in jail without a card with action getoutofjailfree', () => {
        expect(PlayerActions.refresh(gameState)).not.to.contain(
          'USE_GET_OUT_OF_JAIL_FREE_CARD',
          'Get Out of Jail Free action is available'
        );
      });
      it('does not return if player is not in jail', () => {
        expect(PlayerActions.refresh(gameState)).not.to.contain(
          'USE_GET_OUT_OF_JAIL_FREE_CARD',
          'Get Out of Jail Free action is available'
        );
      });
    });
    describe('PAY_FINE', () => {
      it('returns if player is in jail', () => {
        gameState.currentPlayer.jailed = 0;
        expect(PlayerActions.refresh(gameState)).to.contain(
          'PAY_FINE',
          'Pay Fine action is unavailable'
        );
      });
      it('does not return if player is not in jail', () => {
        expect(PlayerActions.refresh(gameState)).not.to.contain(
          'PAY_FINE',
          'Pay Fine action is available'
        );
      });
    });
    describe('MANAGE_PROPERTIES', () => {
      it('returns if player owns properties', () => {
        gameState.config.propertyConfig.properties[0].ownedBy =
          gameState.currentPlayer.id;
        expect(PlayerActions.refresh(gameState)).to.contain(
          'MANAGE_PROPERTIES',
          'Manage Properties action is unavailable'
        );
      });
      it('does not return if player owns no properties', () => {
        expect(PlayerActions.refresh(gameState)).not.to.contain(
          'MANAGE_PROPERTIES',
          'Manage Properties action is available'
        );
      });
    });
    describe('END_GAME', () => {
      it('always returns', () => {
        expect(PlayerActions.refresh(gameState)).to.contain(
          'END_GAME',
          'END_GAME action is not available'
        );
      });
    });
    describe('PLAYER_INFO', () => {
      it('always returns', () => {
        expect(PlayerActions.refresh(gameState)).to.contain(
          'PLAYER_INFO',
          'PLAYER_INFO action is not available'
        );
      });
    });
  });

  describe('prompt', () => {
    it('prompts the user for input', () => {
      const UI = mockUIFactory();
      const promptUISpy = sinon.spy();
      UI.prompt = promptUISpy;
      const message = 'whee';

      PlayerActions.prompt({ UI }, message);
      expect(promptUISpy.calledOnceWithExactly(message)).to.equal(
        true,
        'Prompt was not called exactly once'
      );
    });
    it('returns undefined if action does not exist', () => {
      const UI = mockUIFactory();
      const promptUIStub = sinon.stub();
      promptUIStub.returns('fake');
      UI.prompt = promptUIStub;

      expect(PlayerActions.prompt({ UI }, gameState)).to.be.undefined;
    });
  });
  describe('numberPrompt', () => {
    it('prompts the user for input', () => {
      const UI = mockUIFactory();
      const numberPromptUISpy = sinon.spy();
      UI.promptNumber = numberPromptUISpy;
      const message = 'whee';

      PlayerActions.numberPrompt(UI, message);
      expect(numberPromptUISpy.calledOnceWithExactly(message)).to.equal(
        true,
        'Prompt was not called exactly once'
      );
    });
  });
  describe('confirm', () => {
    it('prompts the user for input', () => {
      const UI = mockUIFactory();
      const confirmUISpy = sinon.spy();
      UI.promptConfirm = confirmUISpy;
      const message = 'whee';

      PlayerActions.confirm(UI, message);
      expect(confirmUISpy.calledOnceWithExactly(message)).to.equal(
        true,
        'Prompt was not called exactly once'
      );
    });
  });
  describe('select', () => {
    it('prompts the user for input', () => {
      const UI = mockUIFactory();
      const promptSelectUISpy = sinon.spy();
      UI.promptSelect = promptSelectUISpy;
      const actions = ['1', '2', '3'];

      PlayerActions.select(UI, actions);
      expect(
        promptSelectUISpy.calledOnceWithExactly(
          actions,
          'Which action would you like to take?',
          {}
        )
      ).to.equal(true, 'Prompt was not called exactly once');
    });
    it('prompts the user for input with optional params', () => {
      const UI = mockUIFactory();
      const promptSelectUISpy = sinon.spy();
      UI.promptSelect = promptSelectUISpy;
      const actions = ['1', '2', '3'];
      const options = {
        cancel: false,
      };

      PlayerActions.select(UI, actions, options);
      expect(
        promptSelectUISpy.calledOnceWithExactly(
          actions,
          'Which action would you like to take?',
          options
        )
      ).to.equal(true, 'Prompt was not called exactly once');
    });
    it('returns if action exists', () => {
      const UI = mockUIFactory();
      const promptSelectUIStub = sinon.stub();
      UI.promptSelect = promptSelectUIStub;
      const chosenOption = 1;
      promptSelectUIStub.returns(chosenOption);
      const actions = ['1', '2', '3'];

      expect(PlayerActions.select(UI, actions)).to.equal(
        actions[chosenOption],
        `select did not return corresponding action given the index selection`
      );
    });
    it('returns if value of action when actions are objects with display and value params', () => {
      const UI = mockUIFactory();
      const promptSelectUIStub = sinon.stub();
      UI.promptSelect = promptSelectUIStub;
      const chosenOption = 1;
      promptSelectUIStub.returns(chosenOption);
      const actions = [
        {
          display: 'fine wine',
          value: {
            name: 'fine wine',
            price: 10,
          },
        },
        {
          display: 'fine cheese',
          value: {
            name: 'fine cheese',
            price: 100,
          },
        },
        {
          display: 'fine taco',
          value: {
            name: 'fine taco',
            price: 40,
          },
        },
      ];

      expect(PlayerActions.select(UI, actions)).to.equal(
        actions[chosenOption].value,
        `select did not return corresponding action given the index selection`
      );
    });
    it('returns if actions are strings without underscore(_)', () => {
      const UI = mockUIFactory();
      const promptSelectUIStub = sinon.stub();
      UI.promptSelect = promptSelectUIStub;
      const chosenOption = 1;
      promptSelectUIStub.returns(chosenOption);
      const actions = ['1_1', '2_2', '3_3'];

      expect(PlayerActions.select(UI, actions)).to.equal(
        actions[chosenOption],
        `select did not return corresponding action given the index selection`
      );
      expect(
        promptSelectUIStub.calledOnceWithExactly(
          actions.map((a) => a.replace('_', ' ')),
          'Which action would you like to take?',
          {}
        )
      ).to.equal(
        true,
        'Prompt Select did not remove the underscores from the string input'
      );
    });
    it('returns cancel if action does not exist', () => {
      const UI = mockUIFactory();
      const promptSelectUIStub = sinon.stub();
      UI.promptSelect = promptSelectUIStub;
      const chosenOption = -1;
      promptSelectUIStub.returns(chosenOption);
      const actions = [1, 2, 3];

      expect(PlayerActions.select(UI, actions)).to.equal(
        'CANCEL',
        `select did not return cancel given the -1 selection`
      );
    });
    it('returns cancel if actions contains no entries', () => {
      const UI = mockUIFactory();
      const promptSelectUIStub = sinon.stub();
      UI.promptSelect = promptSelectUIStub;
      const actions = [];

      expect(PlayerActions.select(UI, actions)).to.equal(
        'CANCEL',
        `select did not return cancel given no actions`
      );
    });
  });
  describe('selectProperties', () => {
    it('calls the select method', () => {
      const UI = mockUIFactory();
      const promptSelectUISpy = sinon.spy();
      UI.promptSelect = promptSelectUISpy;
      const actions = ['1', '2', '3'];

      PlayerActions.selectProperties(UI, actions);
      expect(promptSelectUISpy.calledOnce).to.equal(
        true,
        'Prompt was not called exactly once'
      );
    });
    it('maps the properties with the UI#mapPropertyShortDisplay', () => {
      const UI = mockUIFactory();
      const selectStub = sinon.stub(PlayerActions, 'select');

      const mapPropertyShortDisplayUIStub = sinon.stub();
      UI.mapPropertyShortDisplay = mapPropertyShortDisplayUIStub;
      mapPropertyShortDisplayUIStub.returns(true);
      const actions = ['1', '2', '3'];

      PlayerActions.selectProperties(UI, actions);
      expect(mapPropertyShortDisplayUIStub.callCount).to.equal(
        actions.length,
        `UI#mapPropertyShortDisplay was not called ${actions.length} times`
      );

      expect(
        selectStub.calledOnceWithExactly(
          UI,
          actions.map((a) => ({ display: true, value: a }))
        )
      ).to.equal(true, `Did not call method with correctly mapped parameters`);
    });
  });

  describe('auction', () => {
    it('calls the AuctionService', () => {
      const testBaseCost = 100;
      const testProperty = gameState.config.propertyConfig.properties.find(
        (p) => p.id === 'mediterraneanave'
      );
      const UI = mockUIFactory();
      const playersWithLiquidity = gameState.players.map((player) => ({
        ...player,
        liquidity: calculateLiquidity(
          gameState,
          gameState.config.propertyConfig.properties,
          player
        ),
      }));
      const auctionServiceStub = sinon.stub(AuctionService, 'auction');

      PlayerActions.auction(
        UI,
        playersWithLiquidity,
        testProperty,
        testBaseCost
      );
      expect(
        auctionServiceStub.calledOnceWithExactly(
          UI,
          playersWithLiquidity,
          testProperty,
          testBaseCost
        )
      ).to.equal(true, `Game did not call the AuctionService`);
    });
  });
});
