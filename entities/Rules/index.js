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
    ({ notify }) => notify('START_TURN'), // require('./playerTurnsStart')
  ],
  START_TURN: [
    ({ notify }, gameState) => {
      require('./resetTurnAssociatedValues')({
        // (require('./Defaults/turnValues')),
        speedingCounter: 0,
      })(gameState);
      notify('TURN_VALUES_RESET');
    },
    ({ UI }, gameState) => UI.startTurn(gameState.currentPlayer),
    (_, gameState) =>
      (gameState.currentBoardProperty = require('../PropertyService').getCurrentBoardProperty(
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
        require('./updateTurnValues')({
          forcedPayFine: true,
        })(gameState);
        notify('TURN_VALUES_UPDATED');
        notify('PAY_FINE');
      }
    },
    ({ notify }, gameState) => {
      if (gameState.currentPlayer.jailed === -1) {
        notify('MOVE_PLAYER');
      } else {
        notify('CONTINUE_TURN');
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

      const currentPlayerBoardPosition = require('../PropertyService').findPlayerBoardPosition(
        gameState
      );
      if (gameState.currentPlayer.position > currentPlayerBoardPosition) {
        notify('PASS_GO');
      }
      gameState.currentPlayer.position = currentPlayerBoardPosition;
    },
    (_, gameState) =>
      (gameState.currentBoardProperty = require('../PropertyService').getCurrentBoardProperty(
        gameState
      )),
    ({ UI }, gameState) => UI.playerMovement(gameState.currentBoardProperty),
    ({ notify }, gameState) => {
      const boardProperty = gameState.currentBoardProperty;

      // if has property owned, means property can be purchased
      if (boardProperty.ownedBy === -1) {
        notify('RESOLVE_NEW_PROPERTY');
      }
    },
    ({ notify }) => notify('CONTINUE_TURN'),
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
      require('../WealthService').decrement(
        gameState.currentPlayer,
        gameState.config.fineAmount
      );
      gameState.currentPlayer.jailed = -1;
    },
    function conditionalEventsOnLostWealth({ notify }, gameState) {
      if (
        require('../WealthService').calculateNetWorth(gameState.currentPlayer) <
        Math.abs(gameState.currentPlayer.cash)
      ) {
        notify('BANKRUPTCY');
      } else if (gameState.currentPlayer.cash < 0) {
        // UI: show liquidation menu
        notify('LIQUIDATION');
      }
    },
    ({ notify }, { turnValues }) => {
      // allow continue turn as normal if pre-emptive paying of fine
      if (!turnValues.forcedPayFine) {
        notify('CONTINUE_TURN');
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
      gameState.currentPlayer.position = require('../PropertyService').findProperty(
        gameState,
        'jail'
      ).position;
    },
    ({ notify }) => notify('END_TURN'),
  ],
  END_GAME: [
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

      // TODO
      const playerBuyingPower = require('../WealthService').calculateLiquidity(
        gameState
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
      // TODO
      // const playerBuyingPower = require('../WealthService').calculateLiquidity(
      //   gameState.currentPlayer
      // );

      // if (playerBuyingPower < boardProperty.price) {
      //   require('../LiquidateService').liquidate(UI, gameState);
      // }

      require('../WealthService').buyAsset(
        gameState.currentPlayer,
        boardProperty.price
      );

      // TODO: propertyManagementService: set the owned by
      boardProperty.ownedBy = gameState.currentPlayer.id;
    },
    ({ UI }) => UI.propertyBought(),
  ],
  //   TRADE,
  //   PROPERTY_DEVELOPMENT,
  //   AUCTION,
  //   BANKRUPTCY: () => gameState.currentPlayerActions["END_TURN"].execute(),
  //   // potentially Chance/Community Cards
};
