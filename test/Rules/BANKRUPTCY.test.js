const expect = require('chai').expect;
const EventEmitter = require('events');
const sinon = require('sinon');
const mockUIFactory = require('../mocks/UI');

const { GameState } = require('../../entities/GameState');
const {
  createPlayerFactory,
  createMonopoly,
  getChanceCard,
  getCommunityChestCard,
} = require('../testutils');
const PlayerActions = require('../../entities/PlayerActions');
const PropertyManagementService = require('../../entities/PropertyManagementService');
const config = require('../../config/monopolyConfiguration');
const { cloneDeep } = require('lodash');

describe('Rules -> BANKRUPTCY', () => {
  let gameState;
  let userInterface;
  let eventBus;
  const RULES = require('../../entities/Rules');

  beforeEach(() => {
    gameState = new GameState();
    eventBus = new EventEmitter();
    userInterface = mockUIFactory();
    let createPlayer = createPlayerFactory();
    gameState.players = [
      createPlayer({ name: 'player1' }),
      createPlayer({ name: 'player2' }),
      createPlayer({ name: 'player3' }),
    ];
    gameState.config = cloneDeep(config);
  });

  afterEach(() => {
    // Restore the default sandbox here
    sinon.restore();
  });

  describe('bankruptcy', () => {
    const inputEvent = 'BANKRUPTCY';
    const auctionEvent = 'AUCTION';

    let auctionSpy;

    beforeEach(() => {
      let { emit: notify } = eventBus;
      notify = notify.bind(eventBus);

      RULES[inputEvent].forEach((handler) =>
        eventBus.on(
          inputEvent,
          handler.bind(null, { notify, UI: userInterface }, gameState)
        )
      );
      auctionSpy = sinon.spy();

      eventBus.on(auctionEvent, auctionSpy);
    });

    it('should make a call to the UI#playerLost', () => {
      const uiSpy = sinon.spy();
      userInterface.playerLost = uiSpy;
      eventBus.emit(inputEvent);
      expect(uiSpy.calledOnce).to.equal(
        true,
        `Initial UI method for ${inputEvent} was not called`
      );
    });
    it('should set bankruptcy flag', () => {
      eventBus.emit(inputEvent);
      expect(gameState.currentPlayer.bankrupt).to.equal(
        true,
        'Bankruptcy counter was not set to true'
      );
    });
    it(`should discard all cards remaining on the current player`, () => {
      const chanceCard = getChanceCard(gameState, 'getoutofjailfree');
      const communityChestCard = getCommunityChestCard(
        gameState,
        'getoutofjailfree'
      );

      gameState.currentPlayer.cards = [chanceCard, communityChestCard];

      eventBus.emit(inputEvent);

      expect(gameState.currentPlayer.cards).to.deep.equal(
        [],
        `Player has remaining cards after ${inputEvent}`
      );
      expect(
        gameState.config.communityChestConfig.discardedCards
      ).to.deep.equal(
        [communityChestCard],
        `Player did not discard all remaining community chest cards back to the discard pile on ${inputEvent}`
      );
      expect(gameState.config.chanceConfig.discardedCards).to.deep.equal(
        [chanceCard],
        `Player did not discard all remaining chance cards back to the discard pile on ${inputEvent}`
      );
    });
    it(`should demolish all buildings remaining`, () => {
      const propertyGroup = 'Purple';
      createMonopoly(gameState, propertyGroup);
      const purpleProperties = gameState.config.propertyConfig.properties.filter(
        (p) => p.group === propertyGroup
      );
      purpleProperties[0].buildings = 2;
      purpleProperties[1].buildings = 1;

      eventBus.emit(inputEvent);

      expect(
        PropertyManagementService.getDemoProperties(gameState)
      ).to.deep.equal(
        [],
        `${inputEvent} should demolish all remaining buildings belonging to the player`
      );
    });
    it(`should mortgage all remaining properties`, () => {
      const propertyGroup = 'Purple';
      createMonopoly(gameState, propertyGroup);
      const purpleProperties = gameState.config.propertyConfig.properties.filter(
        (p) => p.group === propertyGroup
      );
      eventBus.emit(inputEvent);

      for (let p of purpleProperties) {
        expect(p.mortgaged).to.equal(
          true,
          `Player did not mortgage all remaining properties on ${inputEvent}`
        );
      }
    });
    it(`should prompt the player to declare bankruptcy`, () => {
      const promptStub = sinon.stub(PlayerActions, 'prompt');
      promptStub.onCall(0).returns('');
      eventBus.emit(inputEvent);

      expect(promptStub.calledOnce).to.equal(
        true,
        `${inputEvent} event did not trigger a prompt to declare bankruptcy`
      );
    });
    it(`should set the game over flag if all other players are bankrupt`, () => {
      gameState.players[2].bankrupt = true;
      eventBus.emit(inputEvent);
      expect(gameState.gameOver).to.equal(
        true,
        `${inputEvent} event did not set the game over flag to true when all other players are bankrupt`
      );
    });
    it(`should auction off all remaining properties`, () => {
      const propertyGroup = 'Purple';
      createMonopoly(gameState, propertyGroup);
      const purpleProperties = gameState.config.propertyConfig.properties.filter(
        (p) => p.group === propertyGroup
      );

      eventBus.emit(inputEvent);

      expect(auctionSpy.callCount).to.equal(
        purpleProperties.length,
        `${inputEvent} event auctioned off all remaining properties belonging to the player`
      );
    });
    it(`should skip auction if game is over`, () => {
      const propertyGroup = 'Purple';
      createMonopoly(gameState, propertyGroup);
      gameState.players[1].bankrupt = true;
      gameState.players[2].bankrupt = true;

      eventBus.emit(inputEvent);

      expect(auctionSpy.callCount).to.equal(
        0,
        `${inputEvent} event auctioned off all remaining properties although game is over`
      );
    });
  });
});
