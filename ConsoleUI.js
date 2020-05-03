const consoleUI = (function (readline) {
  return {
    startGame: () => console.log('\ngame has started'),
    startTurn: (player) =>
      console.log(`STARTING TURN FOR PLAYER: ${player.name}`),
    // UI: get list of dom objects that represent player
    // UI: remove active class from all players
    // UI: toggle active class on that player
    // UI: maybe animate player token?
    displayAvailableActions: (actions) =>
      console.log(`AVAILABLE ACTIONS: ${Object.keys(actions).join(", ")}`),
    prompt: readline.question,
    endTurn: () => console.log("ENDING TURN"),
    rollingDice: () => console.log("ROLLING DICE"),
    rollDiceDisplay: (shouldDisplay) => console.log(`${shouldDisplay ? "DISPLAY" : "GREY OUT" } ROLL_DICE action`),
    payFineDisplay: (shouldDisplay) => console.log(`${shouldDisplay ? "DISPLAY" : "GREY OUT" } PAY_FINE action`),
    endTurnDisplay: (shouldDisplay) => console.log(`${shouldDisplay ? "DISPLAY" : "GREY OUT" } END_TURN action`),
    diceRollResults: (roll1, roll2) => console.log(`DICE ROLLED: ${roll1}, and ${roll2}`),
    rollNormalDice: () => console.log("NORMAL DICE ROLL"),
    rollJailDice: () => console.log("JAIL DICE ROLL"),
    caughtSpeeding: () => console.log("CAUGHT SPEEDING"),
    playerMovement: (position) => console.log(`MOVING PLAYER to square ${position}`),
    payFine: () => console.log(`PAYING FINE 💸💸💸`),
    passGo: () => console.log(`PASSING GO!`),
    jail: () => console.log(`IN JAIL 🤩🤩🤩🤩🤩`),
  };
})(require("readline-sync"));

module.exports = { consoleUI };
