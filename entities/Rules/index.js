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
    // TODO: add bankruptcy check here and END_TURN if true
    // TODO: problem if we keep player is that the turn order increments an extra time going onwards
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
        notify('UPDATE_POSITION_WITH_ROLL');
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
        notify('UPDATE_POSITION_WITH_ROLL');
      }
    },
  ],
  UPDATE_POSITION_WITH_ROLL: [
    ({ notify }, gameState) => {
      gameState.currentPlayer.position += gameState.turnValues.roll.reduce(
        (acc, val) => acc + val,
        0
      );
      notify('MOVE_PLAYER');
    },
  ],
  MOVE_PLAYER: [
    // update position first
    ({ notify }, gameState) => {
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
    ({ UI, notify }, gameState) => {
      // TODO: add extra check if bankrupt and out of the game
      while (gameState.currentPlayer.cash < gameState.config.fineAmount) {
        UI.playerShortOnFunds(
          gameState.currentPlayer.cash,
          gameState.config.fineAmount
        );
        notify('LIQUIDATION');
      }

      require('../WealthService').decrement(
        gameState.currentPlayer,
        gameState.config.fineAmount
      );
      gameState.currentPlayer.jailed = -1;
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
    ({ UI, notify }, gameState) => {
      const boardProperty = gameState.currentBoardProperty;

      while (gameState.currentPlayer.cash < boardProperty.price) {
        UI.playerShortOnFunds(
          gameState.currentPlayer.cash,
          boardProperty.price
        );
        notify('LIQUIDATION');
      }
      // TODO: add cancel option here

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
      const owner = gameState.players.find(
        (p) => p.id === boardProperty.ownedBy
      );

      const rentAmount = require('../PropertyManagementService').calculateRent(
        gameState,
        boardProperty
      );

      // TODO: WEALTHSERVICE: Check Liquidity
      // TODO: add bankruptcy check to explain what will happen
      // pay out what cash is leftover
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
        [...mortgageAbleProps.map((p) => p.name.toUpperCase()), 'CANCEL']
      );

      // TODO: DISPLAY DIFFERENTLY IF MORTGAGED OR NOT
      if (propSelection === 'CANCEL') return;

      if (propSelection) {
        const mortgageProp = mortgageAbleProps.find(
          (p) => p.name.toUpperCase() === propSelection
        );
        if (
          mortgageProp.mortgaged &&
          player.cash <
            (mortgageProp.price / mortgageValueMultiplier) *
              INTEREST_RATE_MULTIPLIER
        ) {
          UI.noCashMustLiquidate(gameState.currentPlayer);
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
        notify('CHANCE');
      }
      if (boardProperty.id.includes('communitychest')) {
        notify('COMMUNITY_CHEST');
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
          // TODO: add bankruptcy check to explain what will happen
          require('../WealthService').decrement(
            gameState.currentPlayer,
            gameState.config.luxuryTaxAmount
          );
          UI.luxuryTaxPaid(gameState.config.luxuryTaxAmount);
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
      // TODO: add bankruptcy check to explain what will happen
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
        const fee = (gameState.config.incomeTaxRate * netWorth).toFixed(2);
        require('../WealthService').decrement(gameState.currentPlayer, fee);
        UI.incomeTaxPaid(fee);
      } else {
        UI.unknownAction();
        notify('INCOME_TAX');
      }
    },
  ],
  LIQUIDATION: [
    ({ UI, notify }, gameState) => {
      const liquidateOption = require('../PlayerActions').prompt(
        { notify, UI },
        gameState,
        // TODO: be smart about what options are available to the user?
        ['MANAGE_PROPERTIES', 'TRADE', 'BANKRUPTCY', 'CANCEL']
      );

      if (liquidateOption === 'CANCEL') return;

      if (liquidateOption) {
        notify(liquidateOption);
      } else {
        UI.unknownAction();
      }

      if (liquidateOption === 'BANKRUPTCY') return;
      notify('LIQUIDATION');
    },
  ],
  CHANCE: [
    ({ UI, notify }, gameState) => {
      const { draw, replaceAvailableCards } = require('../Components/Deck');
      const pmsService = require('../PropertyManagementService');
      const wealthService = require('../WealthService');
      const player = gameState.currentPlayer;
      let cardConfig = gameState.config.chanceConfig;
      if (cardConfig.availableCards.length === 0) {
        cardConfig = replaceAvailableCards(cardConfig);
      }
      const { card, deck } = draw(cardConfig.availableCards);
      cardConfig.availableCards = deck;

      UI.drewCard('chance', card);

      // do the action
      if (card.action === 'getoutofjailfree') {
        player.cards.push(card);
        return;
      }

      switch (card.action) {
        case 'move': {
          let position = 0;
          if (card.tileid) {
            const targetPosition = pmsService.findProperty(
              gameState,
              card.tileid
            ).position;
            position =
              targetPosition > player.position
                ? targetPosition
                : targetPosition + pmsService.getProperties(gameState).length;
          }

          if (card.count) {
            position = player.position + card.count;
          }
          player.position = position;

          notify('MOVE_PLAYER');
          break;
        }
        case 'movenearest': {
          let position = 0;
          const targetPosition = require('../BoardService').nearestPropertyByGroupToPlayer(
            gameState,
            card.groupid
          ).position;
          position =
            targetPosition > player.position
              ? targetPosition
              : targetPosition + pmsService.getProperties(gameState).length;
          player.position = position;

          require('./updateTurnValues')({
            rentMultiplier: card.rentmultiplier,
          })(gameState);
          notify('TURN_VALUES_UPDATED');

          notify('MOVE_PLAYER');
          break;
        }
        case 'addfunds': {
          wealthService.increment(player, card.amount);
          break;
        }
        case 'jail': {
          notify('JAIL');
          break;
        }
        case 'propertycharges': {
          // TODO: check liquidation
          const houses = pmsService.getConstructedHouses(gameState);
          const hotels = pmsService.getConstructedHotels(gameState);
          wealthService.decrement(
            player,
            houses * card.buildings + hotels * card.hotels
          );
          break;
        }
        case 'removefunds': {
          // TODO: check liquidation
          wealthService.decrement(player, card.amount);
          break;
        }
        case 'removefundstoplayers': {
          // TODO: check liquidation
          for (let i = 0; i < gameState.players.length; i++) {
            if (gameState.players[i].id !== player.id) {
              wealthService.exchange(player, gameState.players[i], card.amount);
            }
          }
          break;
        }
      }
      require('../Components/Deck').discard(card, cardConfig.discardedCards);
    },
  ],
  //   TRADE,
  //   BANKRUPTCY: () => gameState.currentPlayerActions["END_TURN"].execute(),
  //   // potentially Chance/Community Cards
};
