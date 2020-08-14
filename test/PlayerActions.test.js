const expect = require('chai').expect;
const sinon = require('sinon');
const mockUIFactory = require('./mocks/UI');

const { GameState } = require('../entities/GameState');
const { createPlayer } = require('./testutils');
const PlayerActions = require('../entities/PlayerActions');

describe('PlayerActions', () => {
  let gameState;

  beforeEach(() => {
    gameState = new GameState();
    gameState.players = [createPlayer({ name: 'player1' })];
    // simulate start of a turn
    require('../entities/Rules/resetTurnAssociatedValues')({
      speedingCounter: 0,
    })(gameState);
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
  });

  describe('prompt', () => {
    it('displays available player actions if no action are passed', () => {
      const UI = mockUIFactory();
      const displayAvailableActionsUISpy = sinon.spy();
      UI.displayAvailableActions = displayAvailableActionsUISpy;
      const actions = PlayerActions.refresh(gameState);

      PlayerActions.prompt({ UI }, gameState);
      expect(
        displayAvailableActionsUISpy.calledOnceWithExactly(actions)
      ).to.equal(true, 'Display Available Actions is not called');
    });
    it('displays input actions when parameter is passed', () => {
      const UI = mockUIFactory();
      const displayAvailableActionsUISpy = sinon.spy();
      UI.displayAvailableActions = displayAvailableActionsUISpy;
      const actions = ['FAKE ACTION', 'SECOND ACTION'];

      PlayerActions.prompt({ UI }, gameState, actions);
      expect(
        displayAvailableActionsUISpy.calledOnceWithExactly(actions)
      ).to.equal(true, 'Display Available Actions is not called');
    });
    it('prompts the user for input', () => {
      const UI = mockUIFactory();
      const promptUISpy = sinon.spy();
      UI.prompt = promptUISpy;

      PlayerActions.prompt({ UI }, gameState);
      expect(
        promptUISpy.calledOnceWithExactly(
          `Which action would you like to take?\n\n`
        )
      ).to.equal(true, 'Prompt was not called exactly once');
    });
    it('returns corresponding action if action exists', () => {
      const UI = mockUIFactory();
      const promptUIStub = sinon.stub();
      promptUIStub.returns('ROLL_DICE');
      UI.prompt = promptUIStub;

      expect(PlayerActions.prompt({ UI }, gameState)).to.equal(
        'ROLL_DICE',
        'Corresponding action is not retrieved'
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
});
