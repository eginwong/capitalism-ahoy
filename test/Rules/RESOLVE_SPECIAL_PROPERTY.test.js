const expect = require('chai').expect;
const EventEmitter = require('events');
const sinon = require('sinon');
const mockUIFactory = require('../mocks/UI');

const { GameState } = require('../../entities/GameState');
const { createPlayerFactory } = require('../testutils');
const config = require('../../config/monopolyConfiguration');
const { cloneDeep } = require('lodash');

describe('Rules -> RESOLVE_SPECIAL_PROPERTY', () => {
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

  describe('resolveSpecialProperty', () => {
    const inputEvent = 'RESOLVE_SPECIAL_PROPERTY';
    const jailEvent = 'JAIL';
    const incomeTaxEvent = 'INCOME_TAX';

    let jailSpy;
    let incomeTaxSpy;

    beforeEach(() => {
      let { emit: notify } = eventBus;
      notify = notify.bind(eventBus);

      RULES[inputEvent].forEach((handler) =>
        eventBus.on(
          inputEvent,
          handler.bind(null, { notify, UI: userInterface }, gameState)
        )
      );
      jailSpy = sinon.spy();
      incomeTaxSpy = sinon.spy();

      eventBus.on(jailEvent, jailSpy);
      eventBus.on(incomeTaxEvent, incomeTaxSpy);
    });

    it(`should emit ${jailEvent} event if special property is go to jail`, () => {
      const goToJailProperty = gameState.config.propertyConfig.properties.find(
        (p) => p.id === 'gotojail'
      );
      gameState.currentBoardProperty = goToJailProperty;

      eventBus.emit(inputEvent);

      expect(jailSpy.calledOnce).to.equal(
        true,
        `Go to Jail property did not emit ${jailEvent}`
      );
    });

    it(`should emit ${incomeTaxEvent} event if special property is income tax`, () => {
      const incomeTaxProperty = gameState.config.propertyConfig.properties.find(
        (p) => p.id === 'incometax'
      );
      gameState.currentBoardProperty = incomeTaxProperty;

      eventBus.emit(inputEvent);

      expect(incomeTaxSpy.calledOnce).to.equal(
        true,
        `Income Tax property did not emit ${incomeTaxEvent}`
      );
    });

    it(`should decrement luxury tax if special property is luxury tax`, () => {
      const luxuryTaxProperty = gameState.config.propertyConfig.properties.find(
        (p) => p.id === 'luxurytax'
      );
      gameState.currentBoardProperty = luxuryTaxProperty;
      const originalCash = gameState.currentPlayer.cash;

      eventBus.emit(inputEvent);

      expect(gameState.currentPlayer.cash).to.equal(
        originalCash - gameState.config.luxuryTaxAmount,
        `Luxury Tax property did not decrement ${gameState.config.luxuryTaxAmount} from player's cash`
      );
    });
  });
});
