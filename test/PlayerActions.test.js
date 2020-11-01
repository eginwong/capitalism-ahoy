const expect = require('chai').expect;
const sinon = require('sinon');
const mockUIFactory = require('./mocks/UI');

const { GameState } = require('../entities/GameState');
const { createPlayerFactory } = require('./testutils');
const PlayerActions = require('../entities/PlayerActions');
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
      const actions = [1, 2, 3];

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
      const actions = [1, 2, 3];
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
      const actions = [1, 2, 3];

      expect(PlayerActions.select(UI, actions)).to.equal(
        actions[chosenOption],
        `select did not return corresponding action given the index selection`
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

  describe('auction', () => {
    it('re-auctions when no one bids', () => {
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

      const promptStub = sinon.stub(PlayerActions, 'numberPrompt');
      promptStub.onCall(0).returns(0);
      promptStub.onCall(1).returns(1);
      promptStub.onCall(2).returns(`${testBaseCost}`);
      promptStub.onCall(3).returns(`${testBaseCost + 1}`);
      promptStub.onCall(4).returns(0);
      promptStub.onCall(5).returns(0);

      PlayerActions.auction(
        UI,
        playersWithLiquidity,
        testProperty,
        testBaseCost
      );
      expect(promptStub.callCount).to.equal(
        6,
        `Game did not re-auction when no player provided acceptable bids`
      );
    });
    it('continues auction rounds until only one player is left', () => {
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

      const promptStub = sinon.stub(PlayerActions, 'numberPrompt');
      promptStub.onCall(0).returns(0);
      promptStub.onCall(1).returns(`${testBaseCost + 1}`);
      promptStub.onCall(2).returns(`${testBaseCost + 2}`);
      promptStub.onCall(3).returns(`${testBaseCost + 3}`);
      promptStub.onCall(4).returns(`${testBaseCost + 4}`);
      promptStub.onCall(5).returns(`${testBaseCost + 5}`);
      promptStub.onCall(6).returns(0);

      PlayerActions.auction(
        UI,
        playersWithLiquidity,
        testProperty,
        testBaseCost
      );
      expect(promptStub.callCount).to.equal(
        7,
        `Game did not continue auction rounds with fewer players`
      );
    });
    it('calls expected UI calls for auction process', () => {
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
      const displayPropertyDetailsUISpy = sinon.spy();
      UI.displayPropertyDetails = displayPropertyDetailsUISpy;
      const playersInAuctionUISpy = sinon.spy();
      UI.playersInAuction = playersInAuctionUISpy;
      const playerInAuctionUISpy = sinon.spy();
      UI.playerInAuction = playerInAuctionUISpy;
      const playerOutOfAuctionUISpy = sinon.spy();
      UI.playerOutOfAuction = playerOutOfAuctionUISpy;

      const promptStub = sinon.stub(PlayerActions, 'numberPrompt');
      promptStub.onCall(0).returns(0);
      promptStub.onCall(1).returns(`${testBaseCost + 1}`);
      promptStub.onCall(2).returns(0);

      PlayerActions.auction(
        UI,
        playersWithLiquidity,
        testProperty,
        testBaseCost
      );
      expect(displayPropertyDetailsUISpy.calledOnce).to.equal(
        true,
        `Game did not announce the property to be auctioned`
      );
      expect(
        playersInAuctionUISpy.calledOnceWithExactly(playersWithLiquidity)
      ).to.equal(
        true,
        `Game did not announce the players participating in the auction`
      );
      expect(playerInAuctionUISpy.calledThrice).to.equal(
        true,
        `Game did not announce each player per auction round`
      );
      expect(playerOutOfAuctionUISpy.calledTwice).to.equal(
        true,
        `Game did not announce the players who were eliminated from the auction`
      );
    });
    it('filters players out of the auction so that subsequent rounds are shorter', () => {
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

      const promptStub = sinon.stub(PlayerActions, 'numberPrompt');
      promptStub.onCall(0).returns(0);
      promptStub.onCall(1).returns(`${testBaseCost + 1}`);
      promptStub.onCall(2).returns(`${testBaseCost + 2}`);
      promptStub.onCall(3).returns(`${testBaseCost + 3}`);
      promptStub.onCall(4).returns(0);
      const expectedWinner = playersWithLiquidity[1];
      const expectedCost = testBaseCost + 3;

      expect(
        PlayerActions.auction(
          UI,
          playersWithLiquidity,
          testProperty,
          testBaseCost
        )
      ).to.deep.equal(
        { buyer: expectedWinner, price: expectedCost.toString() },
        `Auction did not filter out players from the auction`
      );
    });
    it('eliminates player if bid is not a number', () => {
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

      const promptStub = sinon.stub(PlayerActions, 'numberPrompt');
      promptStub.onCall(0).returns('0.1abc');
      promptStub.onCall(1).returns(`-`);
      promptStub.onCall(2).returns(`${testBaseCost + 1}`);
      const expectedWinner = playersWithLiquidity[2];
      const expectedCost = testBaseCost + 1;

      expect(
        PlayerActions.auction(
          UI,
          playersWithLiquidity,
          testProperty,
          testBaseCost
        )
      ).to.deep.equal(
        { buyer: expectedWinner, price: expectedCost.toString() },
        `Auction did not eliminate non-numerical input`
      );
    });
    it('eliminates player if bid is below current lowest bid', () => {
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

      const promptStub = sinon.stub(PlayerActions, 'numberPrompt');
      promptStub.onCall(0).returns(0);
      promptStub.onCall(1).returns(`${testBaseCost + 1}`);
      promptStub.onCall(2).returns(`${testBaseCost + 2}`);
      promptStub.onCall(3).returns(`${testBaseCost + 2}`);
      promptStub.onCall(4).returns(0);
      const expectedWinner = playersWithLiquidity[2];
      const expectedCost = testBaseCost + 2;

      expect(
        PlayerActions.auction(
          UI,
          playersWithLiquidity,
          testProperty,
          testBaseCost
        )
      ).to.deep.equal(
        { buyer: expectedWinner, price: expectedCost.toString() },
        `Auction did not filter out player bid that is below minimum bidding cost`
      );
    });
    it("eliminates player if bid is above player's liquidity", () => {
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

      const promptStub = sinon.stub(PlayerActions, 'numberPrompt');
      promptStub.onCall(0).returns(0);
      promptStub.onCall(1).returns(`${testBaseCost + 1}`);
      promptStub.onCall(2).returns(`${playersWithLiquidity[2].liquidity + 1}`);
      const expectedWinner = playersWithLiquidity[1];
      const expectedCost = testBaseCost + 1;

      expect(
        PlayerActions.auction(
          UI,
          playersWithLiquidity,
          testProperty,
          testBaseCost
        )
      ).to.deep.equal(
        { buyer: expectedWinner, price: expectedCost.toString() },
        `Auction did not filter out player bid that is above player liquidity`
      );
    });
    it('returns buyer and price at the end of the auction', () => {
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

      const promptStub = sinon.stub(PlayerActions, 'numberPrompt');
      promptStub.onCall(0).returns(0);
      promptStub.onCall(1).returns(`${testBaseCost + 1}`);
      promptStub.onCall(2).returns(`${testBaseCost + 2}`);
      promptStub.onCall(3).returns(`${testBaseCost + 3}`);
      promptStub.onCall(4).returns(`${testBaseCost + 4}`);
      promptStub.onCall(5).returns(`${testBaseCost + 5}`);
      promptStub.onCall(6).returns(0);
      const expectedWinner = playersWithLiquidity[1];
      const expectedCost = testBaseCost + 5;

      expect(
        PlayerActions.auction(
          UI,
          playersWithLiquidity,
          testProperty,
          testBaseCost
        )
      ).to.deep.equal(
        { buyer: expectedWinner, price: expectedCost.toString() },
        `Auction did not return buyer and expected cost`
      );
    });
    it("returns player's highest bid even if the following round, they enter in an invalid bid", () => {
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

      const promptStub = sinon.stub(PlayerActions, 'numberPrompt');
      promptStub.onCall(0).returns(0);
      promptStub.onCall(1).returns(`${testBaseCost + 1}`);
      promptStub.onCall(2).returns(`${testBaseCost + 2}`);
      promptStub.onCall(3).returns(`${testBaseCost + 1}`);
      promptStub.onCall(4).returns(0);
      const expectedWinner = playersWithLiquidity[2];
      const expectedCost = testBaseCost + 2;

      expect(
        PlayerActions.auction(
          UI,
          playersWithLiquidity,
          testProperty,
          testBaseCost
        )
      ).to.deep.equal(
        { buyer: expectedWinner, price: expectedCost.toString() },
        `Auction did not return highest player's bid even though their subsequent bid was not accepted`
      );
    });
  });
});
