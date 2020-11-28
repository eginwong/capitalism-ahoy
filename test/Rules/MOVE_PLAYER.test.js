const expect = require('chai').expect;
const EventEmitter = require('events');
const sinon = require('sinon');
const mockUIFactory = require('../mocks/UI');

const { GameState } = require('../../entities/GameState');
const { createPlayerFactory } = require('../testutils');
const config = require('../../config/monopolyConfiguration');
const { cloneDeep } = require('lodash');
const { findByGroup, findByPosition } = require('../../entities/helpers');

describe('Rules -> MOVE_PLAYER', () => {
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

  describe('movePlayer', () => {
    const inputEvent = 'MOVE_PLAYER';
    const passGoEvent = 'PASS_GO';
    const resolveNewPropertyEvent = 'RESOLVE_NEW_PROPERTY';
    const payRentEvent = 'PAY_RENT';
    const resolveSpecialPropertyEvent = 'RESOLVE_SPECIAL_PROPERTY';

    let passGoSpy;
    let resolveNewPropertySpy;
    let payRentSpy;
    let resolveSpecialPropertySpy;
    let defaultTurnValMovement;

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
      };
      defaultTurnValMovement = gameState.turnValues.roll.reduce(
        (acc, val) => acc + val,
        0
      );

      passGoSpy = sinon.spy();
      resolveNewPropertySpy = sinon.spy();
      payRentSpy = sinon.spy();
      resolveSpecialPropertySpy = sinon.spy();

      eventBus.on(passGoEvent, passGoSpy);
      eventBus.on(resolveNewPropertyEvent, resolveNewPropertySpy);
      eventBus.on(payRentEvent, payRentSpy);
      eventBus.on(resolveSpecialPropertyEvent, resolveSpecialPropertySpy);
    });

    it('should set gameState current board property', () => {
      gameState.currentPlayer.position = 13;
      const uiSpy = sinon.spy();
      userInterface.playerMovement = uiSpy;
      eventBus.emit(inputEvent);
      const expectedBoardProperty = {
        name: 'States Avenue',
        id: 'statesave',
        position: 13,
        price: 140,
        rent: 10,
        multipliedRent: [50, 150, 450, 625, 750],
        houseCost: 100,
        group: 'Violet',
        ownedBy: -1,
        buildings: 0,
        mortgaged: false,
      };
      expect(gameState.currentBoardProperty).to.deep.equal(
        expectedBoardProperty,
        `GameState currentBoardProperty is not set`
      );
    });
    it('should make a call to the UI#playerMovement', () => {
      gameState.currentPlayer.position = 13;
      const uiSpy = sinon.spy();
      userInterface.playerMovement = uiSpy;
      eventBus.emit(inputEvent);
      const expectedBoardProperty = {
        name: 'States Avenue',
        id: 'statesave',
        position: 13,
        price: 140,
        rent: 10,
        multipliedRent: [50, 150, 450, 625, 750],
        houseCost: 100,
        group: 'Violet',
        ownedBy: -1,
        buildings: 0,
        mortgaged: false,
      };
      expect(uiSpy.calledOnceWithExactly(expectedBoardProperty)).to.equal(
        true,
        `UI method for ${inputEvent} was not called`
      );
    });
    it('should emit pass go when player wraps around board', () => {
      gameState.currentPlayer.position = 42;
      eventBus.emit(inputEvent);
      expect(gameState.currentPlayer.position).to.equal(
        2,
        'Current Player position was not updated'
      );
      expect(passGoSpy.callCount).to.equal(
        1,
        'Move Player did not wrap around the board'
      );
    });
    it('should not emit pass go if player does not wrap around board', () => {
      const originalPosition = 36;
      gameState.currentPlayer.position = originalPosition;
      eventBus.emit(inputEvent);

      expect(passGoSpy.callCount).to.equal(
        0,
        'Move Player emitted pass go event without wrapping around the board'
      );
    });
    it(`should emit ${resolveNewPropertyEvent} event if property is not owned`, () => {
      const testProperty = findByPosition(
        gameState.config.propertyConfig.properties,
        3
      );
      gameState.currentPlayer.position = testProperty.position;

      eventBus.emit(inputEvent);
      expect(resolveNewPropertySpy.callCount).to.equal(
        1,
        `${resolveNewPropertyEvent} event was not called`
      );
    });
    it(`should not emit ${resolveNewPropertyEvent} event if property is owned`, () => {
      const testProperty = findByPosition(
        gameState.config.propertyConfig.properties,
        3
      );
      testProperty.ownedBy = 1;
      gameState.currentPlayer.position = testProperty.position;

      eventBus.emit(inputEvent);
      expect(resolveNewPropertySpy.callCount).to.equal(
        0,
        `${resolveNewPropertyEvent} event was called`
      );
    });
    it(`should emit ${payRentEvent} event if property is owned, not mortgaged, and belonging to someone else`, () => {
      const testProperty = findByPosition(
        gameState.config.propertyConfig.properties,
        defaultTurnValMovement
      );
      testProperty.ownedBy = 1;
      gameState.currentPlayer.position = testProperty.position;

      eventBus.emit(inputEvent);
      expect(payRentSpy.callCount).to.equal(
        1,
        `${payRentEvent} event was not called`
      );
    });
    it(`should not emit ${payRentEvent} event if property is owned by current player`, () => {
      const testProperty = findByPosition(
        gameState.config.propertyConfig.properties,
        defaultTurnValMovement
      );
      testProperty.ownedBy = gameState.currentPlayer.id;
      gameState.currentPlayer.position = testProperty.position;
      eventBus.emit(inputEvent);
      expect(payRentSpy.callCount).to.equal(
        0,
        `${payRentEvent} event was called`
      );
    });
    it(`should not emit ${payRentEvent} event if property is mortgaged`, () => {
      const testProperty = findByPosition(
        gameState.config.propertyConfig.properties,
        defaultTurnValMovement
      );
      testProperty.mortgaged = true;
      gameState.currentPlayer.position = testProperty.position;
      eventBus.emit(inputEvent);
      expect(payRentSpy.callCount).to.equal(
        0,
        `${payRentEvent} event was called`
      );
    });
    it(`should not emit ${payRentEvent} event if property is special`, () => {
      const specialProperty = findByGroup(
        gameState.config.propertyConfig.properties,
        'Special'
      );
      // turn value movement
      gameState.currentPlayer.position = specialProperty.position;
      eventBus.emit(inputEvent);
      expect(payRentSpy.callCount).to.equal(
        0,
        `${payRentEvent} event was called`
      );
    });
    it(`should emit ${resolveSpecialPropertyEvent} event if property is special`, () => {
      const specialProperty = findByGroup(
        gameState.config.propertyConfig.properties,
        'Special'
      );
      // turn value movement
      gameState.currentPlayer.position = specialProperty.position;
      eventBus.emit(inputEvent);
      expect(resolveSpecialPropertySpy.callCount).to.equal(
        1,
        `${resolveSpecialPropertyEvent} event was not called`
      );
    });
    it(`should not emit ${resolveSpecialPropertyEvent} event if property is not special`, () => {
      gameState.currentPlayer.position = gameState.config.propertyConfig.properties.find(
        (p) => p.group !== 'Special'
      ).position;
      eventBus.emit(inputEvent);
      expect(resolveSpecialPropertySpy.callCount).to.equal(
        0,
        `${resolveSpecialPropertyEvent} event was called`
      );
    });
  });
});
