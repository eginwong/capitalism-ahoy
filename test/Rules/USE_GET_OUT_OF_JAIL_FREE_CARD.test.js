const expect = require('chai').expect;
const EventEmitter = require('events');
const sinon = require('sinon');
const mockUIFactory = require('../mocks/UI');

const { GameState } = require('../../entities/GameState');
const {
  createPlayerFactory,
  getChanceCard,
  getCommunityChestCard,
} = require('../testutils');
const config = require('../../config/monopolyConfiguration');
const { cloneDeep } = require('lodash');

describe('Rules -> USE_GET_OUT_OF_JAIL_FREE_CARD', () => {
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

  describe('useGetOutOfJailFreeCard', () => {
    const inputEvent = 'USE_GET_OUT_OF_JAIL_FREE_CARD';

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
        speedingCounter: 0,
      };
    });

    it('should make a call to the UI#getOutOfJailFreeCardUsed', () => {
      const uiSpy = sinon.spy();
      userInterface.getOutOfJailFreeCardUsed = uiSpy;
      const expectedCard = getCommunityChestCard(gameState, 'getoutofjailfree');
      gameState.currentPlayer.cards.push(expectedCard);

      eventBus.emit(inputEvent);
      expect(uiSpy.calledOnce).to.equal(
        true,
        `Initial UI method for ${inputEvent} was not called`
      );
    });
    it(`should set player free from jail`, () => {
      const expectedCard = getCommunityChestCard(gameState, 'getoutofjailfree');
      gameState.currentPlayer.cards.push(expectedCard);

      eventBus.emit(inputEvent);
      expect(gameState.currentPlayer.jailed).to.equal(
        -1,
        'Player is still in jail after using the get out of jail free card'
      );
    });
    it(`the get out of jail free card is discarded into the community chest discard`, () => {
      const expectedCard = getCommunityChestCard(gameState, 'getoutofjailfree');
      gameState.currentPlayer.cards.push(expectedCard);
      eventBus.emit(inputEvent);
      expect(
        gameState.config.communityChestConfig.discardedCards
      ).to.deep.equal(
        [expectedCard],
        `Card was not correctly discarded into community chest`
      );
    });
    it(`the get out of jail free card is discarded into the chance discard`, () => {
      const expectedCard = getChanceCard(gameState, 'getoutofjailfree');
      gameState.currentPlayer.cards.push(expectedCard);
      eventBus.emit(inputEvent);
      expect(gameState.config.chanceConfig.discardedCards).to.deep.equal(
        [expectedCard],
        `Card was not correctly discarded into chance`
      );
    });
  });
});
