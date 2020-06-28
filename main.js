
/**
 * Responsibility: 
 *   Imports resources and starts game loop for node.js environment.
*/

// TODO: Consider making static?

const EventEmitter = require("events");
const { consoleUI } = require("./ConsoleUI");
const { GameState } = require("./entities/GameState");

let gameState = new GameState();
gameState.players = [createPlayer({name: "player1"}), createPlayer({name: "player2"})];

const eventBus = new EventEmitter();
const UI = Object.assign({}, consoleUI);

require("./entities/Game")(eventBus, UI, gameState);

// TODO: replace with class
function createPlayer({ name }) {
  return {
    name,
    position: 0,
    jailed: -1,
    cash: 1500,
    netWorth: 1500,
    getOutOfJailFreeCards: 0,
    properties: [],
  };
}

// global error handler
process.on('uncaughtException', function (err) {
  console.error(err);
  console.error("OHSNAPZ");
});

eventBus.emit("START_GAME");
