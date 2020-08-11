// TODO: TEST
/**
 * Responsibility:
 *   Imports resources and starts game loop for node.js environment.
 */
// global error handler
process.on('uncaughtException', function (err) {
  console.error(err);
});

// Game Dependencies
const EventEmitter = require('events');
const { consoleUI } = require('./ConsoleUI');
const { GameState } = require('./entities/GameState');

let gameState = new GameState(); // or loads gameState
gameState.players = [
  createPlayer({ name: 'player1' }),
  createPlayer({ name: 'player2' }),
];
gameState.config = require('./config/monopolyConfiguration');

const eventBus = new EventEmitter();
const userInterface = Object.assign({}, consoleUI);

// Start the game
require('./entities/Game')({ eventBus, userInterface, gameState });

// ------------------------------- //

// TODO: replace with class
function createPlayer({ name }) {
  return {
    name,
    position: 0,
    jailed: -1,
    cash: 1500,
    assets: 0, // liquidAssets are 1/2 assets
    getOutOfJailFreeCards: 0,
    properties: [],
  };
}
