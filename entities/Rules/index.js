/**
 * Responsibility: Define the Rules for the Game
 *
 * Note: All rules have base type Func<{ notify, UI }, gameState>
 */
module.exports = {
  START_GAME: [
    // select board, select # of players, define players
    // REVISIT: start a new game from an existing one?
    ({ UI }) => UI.startGame(),
    ({ notify, UI }, gameState) => {
      require('./highestRollingPlayerGoesFirst')({ notify, UI }, gameState);
      notify('PLAYER_ORDER_CHANGED');
    },
    ({ notify }) => notify('START_TURN'),
  ],
  START_TURN: [
    ({ notify }, gameState) => {
      require('./resetTurnAssociatedValues')({
        speedingCounter: 0,
      })(gameState);
      notify('TURN_VALUES_RESET');
    },
    ({ UI }, gameState) => UI.startTurn(gameState.currentPlayer),
    (_, gameState) =>
      (gameState.currentBoardProperty = require('../PropertyManagementService').getCurrentPlayerBoardProperty(
        gameState
      )),
    ({ UI }, gameState) => UI.playerDetails(gameState.currentPlayer),
    ({ notify }) => notify('CONTINUE_TURN'),
  ],
  CONTINUE_TURN: [
    ({ notify, UI }, gameState) => {
      const action = require('../PlayerActions').prompt(
        { notify, UI },
        gameState
      );
      if (action) {
        notify(action);
      } else {
        UI.unknownAction();
      }

      // check if we can end turn or continue turn here
      const newlyInJail =
        gameState.turnValues.roll && gameState.currentPlayer.jailed === 0;
      if (newlyInJail) {
        notify('END_TURN');
      } else if (action !== 'END_TURN' && action !== 'END_GAME') {
        notify('CONTINUE_TURN');
      }
    },
  ],
  ROLL_DICE: [
    ({ UI }) => UI.rollingDice(),
    ({ notify }, gameState) => {
      require('./updateTurnValues')({
        roll: require('../Components/Dice').roll({ quantity: 2 }),
      })(gameState);
      notify('TURN_VALUES_UPDATED');
    },
    ({ UI }, { turnValues }) =>
      UI.diceRollResults(turnValues.roll[0], turnValues.roll[1]),
    function conditionalEventsOnDiceRolled({ notify }, gameState) {
      if (gameState.currentPlayer.jailed >= 0) {
        notify('JAIL_ROLL');
      } else {
        notify('MOVE_ROLL');
      }
    },
  ],
  MOVE_ROLL: [
    ({ UI }) => UI.rollNormalDice(),
    ({ notify }, gameState) => {
      const [roll1, roll2] = gameState.turnValues.roll;
      const isDoubles = roll1 === roll2;
      require('./updateTurnValues')({
        // reset to 0 because refresh actions checks speeding counter
        speedingCounter: isDoubles
          ? gameState.turnValues.speedingCounter + 1
          : 0,
      })(gameState);
      notify('TURN_VALUES_UPDATED');
    },
    function conditionalEventsOnSpeeding({ notify }, gameState) {
      if (gameState.turnValues.speedingCounter > 2) {
        notify('SPEEDING');
      } else {
        notify('MOVE_PLAYER');
      }
    },
  ],
  JAIL_ROLL: [
    ({ UI }) => UI.rollJailDice(),
    (_, gameState) => {
      const [roll1, roll2] = gameState.turnValues.roll;
      const isDoubles = roll1 === roll2;
      gameState.currentPlayer.jailed = isDoubles
        ? -1
        : gameState.currentPlayer.jailed + 1;
    },
    ({ notify }, gameState) => {
      if (gameState.currentPlayer.jailed > 2) {
        notify('PAY_FINE');
      }
    },
    ({ notify }, gameState) => {
      if (gameState.currentPlayer.jailed === -1) {
        notify('MOVE_PLAYER');
      }
    },
  ],
  MOVE_PLAYER: [
    // update position first
    ({ notify }, gameState) => {
      gameState.currentPlayer.position += gameState.turnValues.roll.reduce(
        (acc, val) => acc + val,
        0
      );

      const currentPlayerBoardPosition = require('../BoardService').normalizePlayerBoardPosition(
        gameState
      );
      if (gameState.currentPlayer.position > currentPlayerBoardPosition) {
        notify('PASS_GO');
      }
      gameState.currentPlayer.position = currentPlayerBoardPosition;
    },
    (_, gameState) =>
      (gameState.currentBoardProperty = require('../PropertyManagementService').getCurrentPlayerBoardProperty(
        gameState
      )),
    ({ UI }, gameState) => UI.playerMovement(gameState.currentBoardProperty),
    ({ notify }, gameState) => {
      const boardProperty = gameState.currentBoardProperty;
      const currentPlayerIndex = gameState.currentPlayer.id;

      if (boardProperty.ownedBy === -1) {
        notify('RESOLVE_NEW_PROPERTY');
      } else if (
        boardProperty.ownedBy !== -1 &&
        !boardProperty.mortgaged &&
        boardProperty.ownedBy !== currentPlayerIndex &&
        boardProperty.group !== 'Special'
      ) {
        notify('PAY_RENT');
      }
      if (boardProperty.group === 'Special') {
        notify('RESOLVE_SPECIAL_PROPERTY');
      }
    },
  ],
  END_TURN: [
    ({ UI }) => UI.endTurn(),
    (_, gameState) => gameState.turn++,
    ({ notify }) => notify('START_TURN'),
  ],
  PAY_FINE: [
    ({ UI }) => UI.payFine(),
    (_, gameState) => {
      // potentially entering negative wealth here, will be resolved in subsequent rule
      // TODO: WEALTHSERVICE: Check Liquidity
      // what happens if current player doesn't have enough?

      require('../WealthService').decrement(
        gameState.currentPlayer,
        gameState.config.fineAmount
      );
      gameState.currentPlayer.jailed = -1;
    },
    // TODO: see if rule below can be combined above or made modular
    function conditionalEventsOnLostWealth({ notify }, gameState) {
      if (
        require('../WealthService').calculateNetWorth(gameState.currentPlayer) <
        Math.abs(gameState.currentPlayer.cash)
      ) {
        notify('BANKRUPTCY');
      } else if (gameState.currentPlayer.cash < 0) {
        // UI: show liquidation menu
        notify('LIQUIDATION');
        // might need to have cancel here
      }
    },
  ],
  SPEEDING: [({ UI }) => UI.caughtSpeeding(), ({ notify }) => notify('JAIL')],
  PASS_GO: [
    ({ UI }) => UI.passGo(),
    (_, gameState) =>
      require('../WealthService').increment(
        gameState.currentPlayer,
        gameState.config.passGoAmount
      ),
  ],
  JAIL: [
    ({ UI }) => UI.jail(),
    (_, gameState) => {
      gameState.currentPlayer.jailed = 0;
      gameState.currentPlayer.position = require('../PropertyManagementService').findProperty(
        gameState,
        'jail'
      ).position;
    },
  ],
  END_GAME: [
    // TODO: ARE YOU SURE? prompt y/n
    ({ UI }, gameState) => {
      const calcNetWorth = require('../WealthService').calculateNetWorth;

      const { name, netWorth } = gameState.players
        .map((player) => ({
          name: player.name,
          netWorth: calcNetWorth(player),
        }))
        .reduce((acc, val) => {
          if (!!acc.netWorth && acc.netWorth > val.netWorth) return acc;
          return val;
        }, {});
      UI.gameOver(name, netWorth);
    },
  ],
  RESOLVE_NEW_PROPERTY: [
    ({ UI }, gameState) => {
      UI.displayPropertyDetails(gameState.currentBoardProperty);
    },
    ({ notify, UI }, gameState) => {
      const boardProperty = gameState.currentBoardProperty;
      const playerBuyingPower = require('../WealthService').calculateLiquidity(
        gameState,
        require('../PropertyManagementService').getProperties(gameState)
      );

      if (playerBuyingPower < boardProperty.price) {
        notify('BEGIN_AUCTION');
      } else {
        const action = require('../PlayerActions').prompt(
          { notify, UI },
          gameState,
          ['BUY_PROPERTY', 'BEGIN_AUCTION']
        );

        if (action) {
          notify(action);
        } else {
          UI.unknownAction();
          notify('RESOLVE_NEW_PROPERTY');
        }
      }
    },
  ],
  BUY_PROPERTY: [
    ({ UI }, gameState) => {
      const boardProperty = gameState.currentBoardProperty;

      // checking buying power first in case we have a cancel option in the future
      // const playerBuyingPower = require('../WealthService').calculateLiquidity(
      //   gameState,
      //   require ...
      // );

      // if (playerBuyingPower < boardProperty.price) {
      //   require('../LiquidateService').liquidate(UI, gameState);
      // }

      require('../WealthService').buyAsset(
        gameState.currentPlayer,
        boardProperty.price
      );

      require('../PropertyManagementService').changeOwner(
        boardProperty,
        gameState.currentPlayer.id
      );
    },
    ({ UI }) => UI.propertyBought(),
  ],
  PAY_RENT: [
    ({ UI }, gameState) => {
      const boardProperty = gameState.currentBoardProperty;
      const owner = gameState.players[boardProperty.ownedBy];

      const rentAmount = require('../PropertyManagementService').calculateRent(
        gameState,
        boardProperty
      );

      // TODO: WEALTHSERVICE: Check Liquidity
      // what happens if current player doesn't have enough?
      require('../WealthService').exchange(
        gameState.currentPlayer,
        owner,
        rentAmount
      );

      UI.payingRent(gameState.currentPlayer, owner, rentAmount);
    },
  ],
  MANAGE_PROPERTIES: [
    // TODO: potentially refactor this prompt pattern
    ({ notify, UI }, gameState) => {
      const action = require('../PlayerActions').prompt(
        { notify, UI },
        gameState,
        require('../PropertyManagementService').getAvailableManagementActions(
          gameState
        )
      );

      if (action === 'CANCEL') return;

      if (action) {
        notify(action);
      } else {
        UI.unknownAction();
      }

      notify('MANAGE_PROPERTIES');
    },
  ],
  RENOVATE: [
    ({ notify, UI }, gameState) => {
      const renoProps = require('../PropertyManagementService').getRenoProperties(
        gameState
      );
      const propSelection = require('../PlayerActions').prompt(
        { notify, UI },
        gameState,
        [...renoProps.map((p) => p.name), 'CANCEL']
      );

      if (propSelection === 'CANCEL') return;

      if (propSelection) {
        const propToReno = renoProps.find((p) => p.name === propSelection);
        require('../PropertyManagementService').renovate(gameState, propToReno);
      } else {
        UI.unknownAction();
      }

      notify('RENOVATE');
    },
  ],
  DEMOLISH: [
    ({ notify, UI }, gameState) => {
      const demoProps = require('../PropertyManagementService').getDemoProperties(
        gameState
      );
      const propSelection = require('../PlayerActions').prompt(
        { notify, UI },
        gameState,
        [...demoProps.map((p) => p.name), 'CANCEL']
      );

      if (propSelection === 'CANCEL') return;

      if (propSelection) {
        const propToReno = demoProps.find((p) => p.name === propSelection);
        require('../PropertyManagementService').demolish(gameState, propToReno);
      } else {
        UI.unknownAction();
      }

      notify('DEMOLISH');
    },
  ],
  MORTGAGE: [
    ({ notify, UI }, gameState) => {
      const player = gameState.currentPlayer;
      const {
        interestRate,
        mortgageValueMultiplier,
      } = gameState.config.propertyConfig;

      const INTEREST_RATE_MULTIPLIER = 1 + interestRate;
      // can only mortgage or unmortgage properties with 0 buildings
      const mortgageAbleProps = require('../PropertyManagementService')
        .getProperties(gameState)
        .filter((p) => p.ownedBy === player.id && p.buildings === 0);
      const propSelection = require('../PlayerActions').prompt(
        { notify, UI },
        gameState,
        [...mortgageAbleProps.map((p) => p.name), 'CANCEL']
      );

      if (propSelection === 'CANCEL') return;

      if (propSelection) {
        const mortgageProp = mortgageAbleProps.find(
          (p) => p.name === propSelection
        );
        if (
          mortgageProp.mortgaged &&
          player.cash <
            (mortgageProp.price / mortgageValueMultiplier) *
              INTEREST_RATE_MULTIPLIER
        ) {
          UI.noCashMustLiquidate();
        } else {
          require('../PropertyManagementService').toggleMortgageOnProperty(
            gameState,
            mortgageProp
          );
        }
      } else {
        UI.unknownAction();
      }

      notify('MORTGAGE');
    },
  ],
  RESOLVE_SPECIAL_PROPERTY: [
    ({ UI, notify }, gameState) => {
      const boardProperty = gameState.currentBoardProperty;
      if (boardProperty.id.includes('chance')) {
      }
      if (boardProperty.id.includes('communitychest')) {
      }
      switch (boardProperty.id) {
        case 'incometax':
          notify('INCOME_TAX');
          break;
        case 'gotojail':
          notify('JAIL');
          break;
        case 'luxurytax':
          // potentially entering negative wealth here, will be resolved in subsequent rule
          // TODO: WEALTHSERVICE: Check Liquidity
          // what happens if current player doesn't have enough?
          require('../WealthService').decrement(
            gameState.currentPlayer,
            gameState.config.luxuryTaxAmount
          );
          break;
        default:
          break;
      }
    },
  ],
  INCOME_TAX: [
    ({ UI }, gameState) =>
      UI.incomeTaxPayment(
        gameState.config.incomeTaxAmount,
        gameState.config.incomeTaxRate * 100
      ),
    ({ UI, notify }, gameState) => {
      const FIXED = 'FIXED';
      const VARIABLE = 'VARIABLE';

      const paymentSelection = require('../PlayerActions').prompt(
        { notify, UI },
        gameState,
        [FIXED, VARIABLE]
      );

      // potentially entering negative wealth here, will be resolved in subsequent rule
      // TODO: WEALTHSERVICE: Check Liquidity
      // what happens if current player doesn't have enough?
      if (paymentSelection === FIXED) {
        require('../WealthService').decrement(
          gameState.currentPlayer,
          gameState.config.incomeTaxAmount
        );
        UI.incomeTaxPaid(gameState.config.incomeTaxAmount);
      } else if (paymentSelection === VARIABLE) {
        const netWorth = require('../WealthService').calculateNetWorth(
          gameState.currentPlayer
        );
        const fee = gameState.config.incomeTaxRate * netWorth;
        require('../WealthService').decrement(gameState.currentPlayer, fee);
        UI.incomeTaxPaid(fee);
      } else {
        UI.unknownAction();
        notify('INCOME_TAX');
      }
    },
  ],
  //   TRADE,
  //   BANKRUPTCY: () => gameState.currentPlayerActions["END_TURN"].execute(),
  //   // potentially Chance/Community Cards
};
