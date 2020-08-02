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
            require('./highestRollingPlayerGoesFirst')({ notify, UI}, gameState);
            notify("PLAYER_ORDER_CHANGED");
        },
    ({ notify }) => notify("START_TURN"), // require('./playerTurnsStart')
  ],
  START_TURN: [
    ({ notify }, gameState) => {
      require("./resetTurnAssociatedValues")({
        //(require('./Defaults/turnValues')),
        speedingCounter: 0,
      })(gameState);
      notify("TURN_VALUES_RESET");
    },
    ({ UI }, gameState) => UI.startTurn(gameState.currentPlayer),
    ({ notify }) => notify("CONTINUE_TURN"),
  ],
  CONTINUE_TURN: [
    ({ notify, UI }, gameState) => {
      const action = require("../PlayerActions").prompt(
        { notify, UI },
        gameState
      );
      if (action) {
        notify(action);
      } else {
        UI.unknownAction();
        notify("CONTINUE_TURN");
      }
    },
  ],
  ROLL_DICE: [
    ({ UI }) => UI.rollingDice(),
    ({ notify }, gameState) => {
      require("./updateTurnValues")({
        roll: require("../Components/Dice").roll({ quantity: 2 }),
      })(gameState);
      notify("TURN_VALUES_UPDATED");
    },
    ({ UI }, { turnValues }) =>
      UI.diceRollResults(turnValues.roll[0], turnValues.roll[1]),
    function conditionalEventsOnDiceRolled({ notify }, gameState) {
      if (gameState.currentPlayer.jailed >= 0) {
        notify("JAIL_ROLL");
      } else {
        notify("MOVE_ROLL");
      }
    },
    ({ notify }) => notify("CONTINUE_TURN"),
  ],
  MOVE_ROLL: [
    ({ UI }) => UI.rollNormalDice(),
    ({ notify }, gameState) => {
      const [roll1, roll2] = gameState.turnValues.roll;
      const isDoubles = roll1 === roll2;
      require("./updateTurnValues")({
        // reset to 0 because refresh actions checks speeding counter
        speedingCounter: isDoubles
          ? gameState.turnValues.speedingCounter + 1
          : 0,
      })(gameState);
      notify("TURN_VALUES_UPDATED");
    },
    function conditionalEventsOnSpeeding({ notify }, gameState) {
      if (gameState.turnValues.speedingCounter > 2) {
        notify("SPEEDING");
      } else {
        notify("MOVE_PLAYER");
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
        notify("PAY_FINE");
      }
    },
    ({ notify }, gameState) => {
      if (gameState.currentPlayer.jailed === -1) {
        notify("MOVE_PLAYER");
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
      const currentPlayerBoardPosition = require("../PropertyService").findPlayerBoardPosition(
        gameState
      );
      if (gameState.currentPlayer.position > currentPlayerBoardPosition) {
        notify("PASS_GO");
      }
      gameState.currentPlayer.position = currentPlayerBoardPosition;
    },
    ({ UI }, gameState) => UI.playerMovement(gameState.currentPlayer.position),
    (_, gameState) => {
      const property = require("../PropertyService").getCurrentBoardProperty(
        gameState
      );
      // TODO: something with the property
      console.dir(property);
      // based on tile type, can either [RESOLUTION PHASE] (refresh actions)
      //   BUY, AUCTION, LIQUIDATE, PAY_RENT
    },
  ],
  END_TURN: [
    ({ UI }) => UI.endTurn(),
    (_, gameState) => gameState.turn++,
    ({ notify }) => notify("START_TURN"),
  ],
  PAY_FINE: [
    ({ UI }) => UI.payFine(),
    // TODO: WealthService
    (_, gameState) => {
      gameState.currentPlayer.cash -= gameState.config.fineAmount;
      gameState.currentPlayer.jailed = -1;
      // TODO: investigate using setter for bankruptcy logic
    },
    function conditionalEventsOnLostWealth({ notify }, gameState) {
      // REVISIT: NETWORTH
      // if (gameState.currentPlayer.cash < 0 && gameState.currentPlayer.netWorth < Math.abs(gameState.currentPlayer.cash)) {
      if (
        gameState.currentPlayer.netWorth <
        Math.abs(gameState.currentPlayer.cash)
      ) {
        notify("BANKRUPTCY");
      } else if (gameState.currentPlayer.cash < 0) {
        // UI: show liquidation menu
        // TODO: KENTINUE
        notify("LIQUIDATION");
      }
      // UI: disable action
    },
    ({ notify }) => notify("CONTINUE_TURN"),
  ],
  SPEEDING: [({ UI }) => UI.caughtSpeeding(), ({ notify }) => notify("JAIL")],
  PASS_GO: [
    ({ UI }) => UI.passGo(),
    (_, gameState) =>
      (gameState.currentPlayer.cash += gameState.config.passGoAmount),
    ({ notify }) => notify("JAIL"),
  ],
  JAIL: [
    ({ UI }) => UI.jail(),
    (_, gameState) => {
      gameState.currentPlayer.jailed = 0;
      gameState.currentPlayer.position = require("../PropertyService").findProperty(
        gameState,
        "jail"
      ).position;
    },
    ({ notify }) => notify("END_TURN"),
  ],
  END_GAME: [
    ({ UI }, gameState) => {
      const { name, netWorth } = gameState.players.reduce((acc, val) => {
        if (!!acc.netWorth && acc.netWorth > val.netWorth) return acc;
        return val;
      }, {});
      UI.gameOver(name, netWorth);
    },
  ],
  //   BUY_PROPERTY: () => {},
  //   PAY_RENT,
  //   TRADE,
  //   PROPERTY_DEVELOPMENT,
  //   AUCTION,
  //   BANKRUPTCY: () => gameState.currentPlayerActions["END_TURN"].execute(),
  //   // potentially Chance/Community Cards
};
