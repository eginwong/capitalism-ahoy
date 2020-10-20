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
    payingRent: (player, owner, amount) =>
      console.log(`${player.name} paid $${amount} in rent to ${owner.name}`),
    noCashMustLiquidate: (player) =>
      console.log(
        `Player only has ${player.cash} and cannot complete the operation. Either sell or liquidate assets and try again.`
      ),
    incomeTaxPayment: (flatFee, taxRate) => {
      console.log(
        `INCOME TAX: Pay fixed fee ($${flatFee}) or variable fee (${taxRate}% of your net-worth)`
      );
    },
    incomeTaxPaid: (cost) => {
      console.log(`INCOME TAX: Paid a total of $${cost}`);
    },
    luxuryTaxPaid: (cost) => {
      console.log(`LUXURY TAX: Paid a total of $${cost}`);
    },
    playerShortOnFunds: (cashOnHand, price) => {
      console.log(
        `💰💰💰: Insufficient funds ($${cashOnHand}) to afford payment ($${price})`
      );
    },
    drewCard: (type, { title }) =>
      console.log(`${type.toUpperCase()}: ${title}`),
    getOutOfJailFreeCardUsed: () =>
      console.log(
        'GET OUT OF JAIL FREE: Card was used and returned to the discard deck.'
      ),
    auctionInstructions: () =>
      console.log(
        'AUCTION: The rules are as follows: All players who can afford the property will continue to bid in rounds until there is one winner. Players take turns inputting their bids each round. If a player bids nothing or a bid below the current bidding cost, that player is out of the auction. At least one player must bid to exit the auction.'
      ),
    auctionPropertyInfo: (property) => {
      console.log(`AUCTION: ${property.name}`);
      console.dir(property);
    },
    playersInAuction: (players) => {
      let playerInfo = `PLAYERS IN AUCTION: `;

      for (let player of players) {
        playerInfo += `(${player.name}, $${player.liquidity}) `;
      }
      console.log(playerInfo);
    },
    playerInAuction: (player) =>
      console.log(`${player.name}, $${player.liquidity}`),
    playerOutOfAuction: (player) =>
      console.log(
        `${player.name}'s bid is either under the acceptable amount or over the player's available liquidity.`
      ),
    wonAuction: (player, price) =>
      console.log(`Property SOLD to ${player.name} for $${price}`),
  };
})(require('readline-sync'));

module.exports = { consoleUI };
