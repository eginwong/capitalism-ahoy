const c = require('ansi-colors');
const Table = require('cli-table3');

const consoleUI = (function (readline) {
  const colorMap = {
    Purple: c.bgMagenta('Purple'),
    Red: c.bgRed('Red'),
    Orange: c.bgRedBright('Orange'),
    Violet: c.bgMagentaBright('Violet'),
    'Dark Green': c.bgGreen('Dark Green'),
    'Dark Blue': c.bgBlue('Dark Blue'),
    'Light Green': c.bgGreenBright('Light Green'),
    Railroad: c.bgBlack.white('Railroad'),
    Utilities: c.bgCyan('Utilities'),
    Yellow: c.bgYellow('Yellow'),
  };

  function mapPropertyGroupToColor(prop) {
    return `${colorMap[prop.group]} ${prop.name}`;
  }

  function mapPropertyShortDisplay(prop) {
    return `${mapPropertyGroupToColor(prop)} - 💰: $${prop.price}${
      prop.mortgaged ? ' | mortgaged' : ''
    }${prop.buildings > 0 ? ' | ' + prop.buildings + '🏠' : ''}${
      prop.rent > 0 ? ' | Rent: $' + prop.rent : ''
    }
    ${
      prop.multipliedRent
        ? ' | with 🏠:' + prop.multipliedRent.map((r) => ' $' + r)
        : ''
    }`;
  }

  function mapPropertyLongDisplay(prop) {
    let display = `  ${mapPropertyGroupToColor(prop)}, position: ${
      prop.position
    }\n`;

    if (prop.group === 'Railroad') {
      display += `  | Price 💰: ${c.bold('$' + prop.price)}${
        prop.mortgaged ? ' - mortgaged' : ''
      }\n  | Rent: depends on # of railroads owned`;
    } else if (prop.group === 'Utilities') {
      display += `  | Price 💰: ${c.bold('$' + prop.price)}${
        prop.mortgaged ? ' - mortgaged' : ''
      }\n  | Rent: # of utilities owned * 🎲🎲`;
    } else {
      display += `  | Price 💰: ${c.bold('$' + prop.price)}${
        prop.mortgaged ? ' - mortgaged' : ''
      }${prop.buildings > 0 ? ` - ${prop.buildings}🏠` : ''}\n  | Rent: $${
        prop.rent
      }; with 🏠:${prop.multipliedRent.map((r) => ` $${r}`)}\n  | 🏠 Cost: $${
        prop.houseCost
      }`;
    }
    return display;
  }

  return {
    startGame: () => console.log('\ngame has started'),
    startTurn: (player) =>
      console.log(`\nSTARTING TURN FOR PLAYER: ${player.name}`),
    // UI: get list of dom objects that represent player
    // UI: remove active class from all players
    // UI: toggle active class on that player
    // UI: maybe animate player token?
    displayPropertyDetails: (boardProperty) =>
      console.log(mapPropertyLongDisplay(boardProperty)),
    promptConfirm: readline.keyInYNStrict,
    promptNumber: readline.questionInt,
    promptSelect: readline.keyInSelect,
    prompt: readline.question,
    endTurn: () => console.log(c.bold.red('ENDING TURN')),
    rollingDice: () => console.log('🎲ROLLING🎲'),
    rollDiceDisplay: (shouldDisplay) =>
      shouldDisplay
        ? console.log(c.dim.greenBright(`"DISPLAY" ROLL_DICE action`))
        : console.log(c.grey(`"GREY OUT" ROLL_DICE action`)),
    payFineDisplay: (shouldDisplay) =>
      shouldDisplay
        ? console.log(c.dim.greenBright(`"DISPLAY" PAY_FINE action`))
        : console.log(c.grey(`"GREY OUT" PAY_FINE action`)),
    endTurnDisplay: (shouldDisplay) =>
      shouldDisplay
        ? console.log(c.dim.greenBright(`"DISPLAY" END_TURN action`))
        : console.log(c.grey(`"GREY OUT" END_TURN action`)),
    diceRollResults: (roll1, roll2) =>
      console.log(`ROLLED: 🎲${roll1}, 🎲${roll2}`),
    rollNormalDice: () => console.log('EVENT: NORMAL 🎲🎲🎲'),
    rollJailDice: () => console.log('JAIL 🎲🎲🎲'),
    caughtSpeeding: () => console.log('CAUGHT SPEEDING'),
    playerMovement: (boardProperty) =>
      console.log(
        c.bgBlack.whiteBright(
          `Landed on ${boardProperty.name} (${boardProperty.group})`
        )
      ),
    playerDetails: (player) =>
      console.log(
        `  | Position: ${player.position}${
          player.jailed !== -1 ? ' - 🔒' : ''
        }\n  | 💸: $${player.cash}${player.cards.length !== 0 ? ', 🃏' : ''}`
      ),
    payFine: () => console.log(`PAYING FINE 💸💸💸`),
    passGo: () => console.log(`PASSING GO!`),
    jail: () => console.log(`IN JAIL 🤩🤩🤩🤩🤩`),
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
        'AUCTION: The rules are as follows: All players who can afford the property will continue to bid in rounds until there is one winner. Players take turns inputting their bids each round. If a player bids nothing or a bid below the current bidding cost, that player is out of the auction. At least one player must bid to exit the auction.\n'
      ),
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
    skipTurnForBankruptPlayer: (player) =>
      console.log(
        `Player ${player.name}'s turn is skipped as they are bankrupt and out of the game.`
      ),
    playerLost: (player) =>
      console.log(
        `Insufficient funds. Player ${player.name} declares bankruptcy.`
      ),
    mapPropertyShortDisplay,
    showPlayerTable: (players, properties) => {
      const propertyText = (prop) => {
        return `${mapPropertyGroupToColor(prop)} - 💰: $${prop.price}${
          prop.mortgaged ? ' | ' + c.red('mortgaged') : ''
        }${prop.buildings > 0 ? ' | ' + prop.buildings + '🏠' : ''}`;
      };

      let cliTable = new Table();
      cliTable.push(['', 'position', 'cash', 'assets', 'properties']);

      players.forEach((p) => {
        cliTable.push([
          `${p.name} ${p.jailed !== -1 ? '🔒' : ''}${p.bankrurpt ? '💀' : ''}`,
          `${p.position} (${
            properties.find((prop) => prop.position === p.position).name
          })`,
          `${c.green('$' + p.cash)}`,
          `${c.green('$' + p.assets)}`,
          `${
            p.properties.length !== 0
              ? p.properties
                  .map(propertyText)
                  .reduce((prev, curr) => `${prev}\n${curr}`)
              : ''
          }`,
        ]);
      });

      console.log(cliTable.toString());
    },
  };
})(require('readline-sync'));

module.exports = { consoleUI };
