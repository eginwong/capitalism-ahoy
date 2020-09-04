const chalk = require('chalk');

const consoleUI = (function (readline) {
  return {
    startGame: () => console.log('\ngame has started'),
    startTurn: (player) =>
      console.log(
        chalk.bgBlack.whiteBright(`STARTING TURN FOR PLAYER: ${player.name}`)
      ),
    // UI: get list of dom objects that represent player
    // UI: remove active class from all players
    // UI: toggle active class on that player
    // UI: maybe animate player token?
    displayAvailableActions: (actions) =>
      console.log(
        chalk.magenta(`AVAILABLE ACTIONS: `) +
          chalk.cyan(`${actions.join(', ')}`)
      ),
    displayPropertyDetails: (boardProperty) => console.dir(boardProperty),
    prompt: readline.question,
    endTurn: () => console.log(chalk.bold.red('ENDING TURN')),
    rollingDice: () => console.log('🎲ROLLING🎲'),
    rollDiceDisplay: (shouldDisplay) =>
      shouldDisplay
        ? console.log(chalk.dim.greenBright(`"DISPLAY" ROLL_DICE action`))
        : console.log(chalk.grey(`"GREY OUT" ROLL_DICE action`)),
    payFineDisplay: (shouldDisplay) =>
      shouldDisplay
        ? console.log(chalk.dim.greenBright(`"DISPLAY" PAY_FINE action`))
        : console.log(chalk.grey(`"GREY OUT" PAY_FINE action`)),
    endTurnDisplay: (shouldDisplay) =>
      shouldDisplay
        ? console.log(chalk.dim.greenBright(`"DISPLAY" END_TURN action`))
        : console.log(chalk.grey(`"GREY OUT" END_TURN action`)),
    diceRollResults: (roll1, roll2) =>
      console.log(`ROLLED: 🎲${roll1}, 🎲${roll2}`),
    rollNormalDice: () => console.log('EVENT: NORMAL 🎲🎲🎲'),
    rollJailDice: () => console.log('JAIL 🎲🎲🎲'),
    caughtSpeeding: () => console.log('CAUGHT SPEEDING'),
    playerMovement: (boardProperty) =>
      console.log(
        chalk.bgBlack.whiteBright(
          `Landed on ${boardProperty.name} (${boardProperty.group})`
        )
      ),
    playerDetails: (player) => console.dir(player),
    payFine: () => console.log(`PAYING FINE 💸💸💸`),
    passGo: () => console.log(`PASSING GO!`),
    jail: () => console.log(`IN JAIL 🤩🤩🤩🤩🤩`),
    unknownAction: () => console.error(`unknown action attempted`),
    gameOver: (name, netWorth) =>
      console.log(
        `Game ended. Winner is: 🎉${name}🎉 with a net worth of: ${netWorth}`
      ),
    propertyBought: () => console.log('Property bought! 🎉🎉'),
    noCashMustLiquidate: (player) =>
      console.log(
        `Player only has ${player.cash} and cannot complete the operation. Either sell or liquidate assets and try again.`
      ),
  };
})(require('readline-sync'));

module.exports = { consoleUI };
