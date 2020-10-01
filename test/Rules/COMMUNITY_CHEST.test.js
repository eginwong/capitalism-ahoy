const expect = require('chai').expect;
const EventEmitter = require('events');
const sinon = require('sinon');
const mockUIFactory = require('../mocks/UI');

const { GameState } = require('../../entities/GameState');
const { createPlayerFactory, createMonopoly } = require('../testutils');
const config = require('../../config/monopolyConfiguration');
const Deck = require('../../entities/Components/Deck');
const PropertyManagementService = require('../../entities/PropertyManagementService');
const { cloneDeep } = require('lodash');

describe('Rules -> COMMUNITY_CHEST', () => {
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

  describe('COMMUNITY_CHEST', () => {
    const inputEvent = 'COMMUNITY_CHEST';
    const movePlayerEvent = 'MOVE_PLAYER';
    const jailEvent = 'JAIL';
    const turnValuesUpdatedEvent = 'TURN_VALUES_UPDATED';

    let movePlayerSpy;
    let turnValuesUpdatedSpy;
    let jailSpy;

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

      movePlayerSpy = sinon.spy();
      turnValuesUpdatedSpy = sinon.spy();
      jailSpy = sinon.spy();

      eventBus.on(movePlayerEvent, movePlayerSpy);
      eventBus.on(turnValuesUpdatedEvent, turnValuesUpdatedSpy);
      eventBus.on(jailEvent, jailSpy);
    });

    it('should make a call to the UI#drewCard', () => {
      const uiSpy = sinon.spy();
      userInterface.drewCard = uiSpy;
      const expectedCard = gameState.config.communityChestConfig.availableCards.find(
        (c) => c.tileid === 'go'
      );
      eventBus.emit(inputEvent);

      expect(
        uiSpy.calledOnceWithExactly('community chest', expectedCard)
      ).to.equal(true, `UI method for ${inputEvent} was not called`);
    });
    it('should replace available cards if available cards are empty', () => {
      let { availableCards } = gameState.config.communityChestConfig;
      const deckReplaceAvailableCardsSpy = sinon.spy(
        Deck,
        'replaceAvailableCards'
      );
      gameState.config.communityChestConfig.discardedCards = availableCards;
      gameState.config.communityChestConfig.availableCards = [];

      eventBus.emit(inputEvent);

      expect(deckReplaceAvailableCardsSpy.calledOnce).to.equal(
        true,
        `${inputEvent} did not replace available cards in the deck when empty`
      );
    });
    it("should add getoutofjailfree card to the current player's cards and not call discard", () => {
      const expectedCard = gameState.config.communityChestConfig.availableCards.find(
        (c) => c.action === 'getoutofjailfree'
      );
      const deckDrawStub = sinon.stub(Deck, 'draw');
      deckDrawStub.returns({ card: expectedCard, deck: [] });

      eventBus.emit(inputEvent);

      expect(gameState.currentPlayer.cards[0]).to.deep.equal(
        expectedCard,
        `${inputEvent} did not add the get out of jail free card to the current player's cards`
      );
      expect(
        gameState.config.communityChestConfig.discardedCards
      ).to.deep.equal(
        [],
        `${inputEvent} for get out of jail free card discarded the card immediately`
      );
    });
    it('should discard card if not getoutofjailfree', () => {
      const expectedCard = gameState.config.communityChestConfig.availableCards.find(
        (c) => c.action === 'move'
      );
      sinon.stub(Deck, 'draw').returns({ card: expectedCard, deck: [] });

      eventBus.emit(inputEvent);

      expect(
        gameState.config.communityChestConfig.discardedCards
      ).to.deep.equal(
        [expectedCard],
        `${inputEvent} did not discard the card immediately`
      );
    });
    describe('move', () => {
      it(`should move player to card tileid by calling ${movePlayerEvent} with looping around`, () => {
        const startingPosition = 10;
        gameState.currentPlayer.position = startingPosition;
        const expectedCard = gameState.config.communityChestConfig.availableCards.find(
          (c) => c.action === 'move' && c.tileid === 'go'
        );
        sinon.stub(Deck, 'draw').returns({ card: expectedCard, deck: [] });
        const properties = gameState.config.propertyConfig.properties;

        eventBus.emit(inputEvent);

        expect(movePlayerSpy.calledOnce).to.equal(
          true,
          `${inputEvent} did not call ${movePlayerEvent} when card action is move`
        );
        expect(gameState.currentPlayer.position).not.to.equal(
          startingPosition,
          `${inputEvent} for a move card did not move the player from its starting position`
        );
        expect(gameState.currentPlayer.position).to.equal(
          properties.find((p) => p.id === 'go').position + properties.length,
          `${inputEvent} for a move card did not move the player's position to expected position + the count of all properties to circle around`
        );
      });
    });
    describe('addfunds', () => {
      it(`should add funds by card amount`, () => {
        const startingCash = gameState.currentPlayer.cash;
        const expectedCard = gameState.config.communityChestConfig.availableCards.find(
          (c) => c.action === 'addfunds'
        );
        sinon.stub(Deck, 'draw').returns({ card: expectedCard, deck: [] });

        eventBus.emit(inputEvent);

        expect(gameState.currentPlayer.cash).to.equal(
          startingCash + expectedCard.amount,
          `${inputEvent} for an addfunds card did not add cash to the player`
        );
      });
    });
    describe('removefunds', () => {
      it(`should remove funds by card amount`, () => {
        const startingCash = gameState.currentPlayer.cash;
        const expectedCard = gameState.config.communityChestConfig.availableCards.find(
          (c) => c.action === 'removefunds'
        );
        sinon.stub(Deck, 'draw').returns({ card: expectedCard, deck: [] });

        eventBus.emit(inputEvent);

        expect(gameState.currentPlayer.cash).to.equal(
          startingCash - expectedCard.amount,
          `${inputEvent} for a removefunds card did not remove cash from the player`
        );
      });
    });
    describe('jail', () => {
      it(`should emit ${jailEvent}`, () => {
        const expectedCard = gameState.config.communityChestConfig.availableCards.find(
          (c) => c.action === 'jail'
        );
        sinon.stub(Deck, 'draw').returns({ card: expectedCard, deck: [] });

        eventBus.emit(inputEvent);

        expect(jailSpy.calledOnce).to.equal(
          true,
          `${inputEvent} for a jail card did not emit the ${jailEvent}`
        );
      });
    });
    describe('propertyCharges', () => {
      it(`should remove funds by amount of houses and hotels`, () => {
        const startingCash = gameState.currentPlayer.cash;
        const expectedCard = gameState.config.communityChestConfig.availableCards.find(
          (c) => c.action === 'propertycharges'
        );
        sinon.stub(Deck, 'draw').returns({ card: expectedCard, deck: [] });
        const testProperties = gameState.config.propertyConfig.properties.filter(
          (p) => p.group === 'Yellow'
        );
        createMonopoly(
          gameState,
          testProperties[0].group,
          gameState.currentPlayer.id
        );
        testProperties[0].buildings = 4;
        testProperties[1].buildings = 5;
        testProperties[2].buildings = 3;

        eventBus.emit(inputEvent);

        const expectedHouseCharge =
          PropertyManagementService.getConstructedHouses(gameState) *
          expectedCard.buildings;
        const expectedHotelCharge =
          PropertyManagementService.getConstructedHotels(gameState) *
          expectedCard.hotels;
        expect(gameState.currentPlayer.cash).to.equal(
          startingCash - expectedHouseCharge - expectedHotelCharge,
          `${inputEvent} for a propertycharges card did not remove correct cash from the player`
        );
      });
    });
    describe('addfundsfromplayers', () => {
      it(`should add funds by amount * # of players, and take cash from all other players`, () => {
        const startingCash = gameState.currentPlayer.cash;
        const startingCashOfOtherPlayers = gameState.players[1].cash;
        const expectedCard = gameState.config.communityChestConfig.availableCards.find(
          (c) => c.action === 'addfundsfromplayers'
        );
        sinon.stub(Deck, 'draw').returns({ card: expectedCard, deck: [] });
        const otherPlayersCount = gameState.players.length - 1;

        eventBus.emit(inputEvent);

        expect(gameState.currentPlayer.cash).to.equal(
          startingCash + otherPlayersCount * expectedCard.amount,
          `${inputEvent} for an addfundsfromplayers card did not add correct cash to the player`
        );
        for (let i = 0; i < gameState.players.length; i++) {
          if (gameState.players[i].id !== gameState.currentPlayer.id) {
            expect(gameState.players[i].cash).to.equal(
              startingCashOfOtherPlayers - expectedCard.amount,
              `${inputEvent} for an addfundsfromplayers card did not remove correct cash from each other player`
            );
          }
        }
      });
    });
  });
});
