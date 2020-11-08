const expect = require('chai').expect;
const EventEmitter = require('events');
const sinon = require('sinon');
const mockUIFactory = require('../mocks/UI');

const { GameState } = require('../../entities/GameState');
const { createPlayerFactory, createMonopoly } = require('../testutils');
const config = require('../../config/monopolyConfiguration');
const { cloneDeep } = require('lodash');

describe('Rules -> COLLECTIONS', () => {
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

  describe('collections', () => {
    const inputEvent = 'COLLECTIONS';
    const bankruptcyEvent = 'BANKRUPTCY';
    const liquidationEvent = 'LIQUIDATION';
    const turnValuesUpdatedEvent = 'TURN_VALUES_UPDATED';

    let bankruptcyStub;
    let liquidationStub;
    let turnValuesUpdatedSpy;

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

      bankruptcyStub = sinon.stub();
      liquidationStub = sinon.stub();
      turnValuesUpdatedSpy = sinon.spy();

      eventBus.on(liquidationEvent, liquidationStub);
      eventBus.on(bankruptcyEvent, bankruptcyStub);
      eventBus.on(turnValuesUpdatedEvent, turnValuesUpdatedSpy);
    });

    it('should do nothing if no subturn in the turn values', () => {
      eventBus.emit(inputEvent);

      expect(liquidationStub.callCount).to.equal(
        0,
        `${liquidationEvent} was called even though there is no sub turn value`
      );
      expect(bankruptcyStub.callCount).to.equal(
        0,
        `${bankruptcyEvent} was called even though there is no sub turn value`
      );
    });
    it('should do nothing if no subturn player is in the turn values', () => {
      gameState.turnValues.subTurn = { charge: 1 };
      eventBus.emit(inputEvent);

      expect(liquidationStub.callCount).to.equal(
        0,
        `${liquidationEvent} was called even though there is no sub turn value`
      );
      expect(bankruptcyStub.callCount).to.equal(
        0,
        `${bankruptcyEvent} was called even though there is no sub turn value`
      );
    });
    it('should do nothing if no subturn charge is in the turn values', () => {
      gameState.turnValues.subTurn = { player: gameState.currentPlayer };
      eventBus.emit(inputEvent);

      expect(liquidationStub.callCount).to.equal(
        0,
        `${liquidationEvent} was called even though there is no sub turn value`
      );
      expect(bankruptcyStub.callCount).to.equal(
        0,
        `${bankruptcyEvent} was called even though there is no sub turn value`
      );
    });
    it(`calls the ${bankruptcyEvent} when liquidity is less than the charge`, () => {
      const arbitraryCharge = 10;
      gameState.currentPlayer.cash = 0;
      gameState.turnValues.subTurn = {
        playerId: gameState.currentPlayer.id,
        charge: arbitraryCharge,
      };
      bankruptcyStub.callsFake(() => {
        gameState.currentPlayer.bankrupt = true;
      });
      eventBus.emit(inputEvent);

      expect(bankruptcyStub.callCount).to.equal(
        1,
        `${bankruptcyEvent} was not called`
      );
    });
    it(`calls the ${bankruptcyEvent} when liquidity is less than the charge after liquidation`, () => {
      const arbitraryCharge = 60;
      gameState.currentPlayer.cash = 0;
      const propertyGroup = 'Purple';
      createMonopoly(gameState, propertyGroup, gameState.currentPlayer.id);
      gameState.turnValues.subTurn = {
        playerId: gameState.currentPlayer.id,
        charge: arbitraryCharge,
      };
      liquidationStub.callsFake(() => {
        gameState.currentPlayer.cash += 57;
        gameState.config.propertyConfig.properties
          .filter((p) => p.group === propertyGroup)
          .forEach((p) => {
            p.mortgaged = true;
          });
      });
      bankruptcyStub.callsFake(() => {
        gameState.currentPlayer.bankrupt = true;
      });
      eventBus.emit(inputEvent);

      expect(bankruptcyStub.callCount).to.equal(
        1,
        `${bankruptcyEvent} was not called`
      );
    });
    it(`calls the ${liquidationEvent} while the player's cash is less than the charge`, () => {
      const arbitraryCharge = 50;
      gameState.currentPlayer.cash = 0;
      createMonopoly(gameState, 'Purple', gameState.currentPlayer.id);
      gameState.turnValues.subTurn = {
        playerId: gameState.currentPlayer.id,
        charge: arbitraryCharge,
      };
      liquidationStub.callsFake(() => {
        gameState.currentPlayer.cash += arbitraryCharge;
      });
      eventBus.emit(inputEvent);

      expect(liquidationStub.callCount).to.equal(
        1,
        `${liquidationEvent} was not called`
      );
    });
    it(`calls the UI#playerShortOnFunds while the player's cash is less than the charge`, () => {
      const arbitraryCharge = 10;
      const startingCash = 0;
      gameState.currentPlayer.cash = startingCash;
      createMonopoly(gameState, 'Purple', gameState.currentPlayer.id);
      gameState.turnValues.subTurn = {
        playerId: gameState.currentPlayer.id,
        charge: arbitraryCharge,
      };
      liquidationStub.callsFake(() => {
        gameState.currentPlayer.cash += arbitraryCharge;
      });
      const uiSpy = sinon.spy();
      userInterface.playerShortOnFunds = uiSpy;
      eventBus.emit(inputEvent);

      expect(
        uiSpy.calledOnceWithExactly(startingCash, arbitraryCharge)
      ).to.equal(
        true,
        `${liquidationEvent} was called and the corresponding UI#playerShortOnFunds was not called with correct parameters`
      );
    });
    it(`calls the ${turnValuesUpdatedEvent} to nullify the sub turn value`, () => {
      gameState.turnValues.subTurn = {
        player: gameState.currentPlayer,
        charge: 1,
      };
      eventBus.emit(inputEvent);

      expect(turnValuesUpdatedSpy.callCount).to.equal(
        1,
        `${turnValuesUpdatedEvent} was not called`
      );
      expect(gameState.turnValues.subTurn).to.equal(
        null,
        `${turnValuesUpdatedEvent} was called although subturn value is still set`
      );
    });
  });
});
