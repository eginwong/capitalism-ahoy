/**
* Responsibility: Define the Rules for the Game
* 
* Note: All rules have base type Func<{ notify, UI }, gameState>
*/
module.exports = {
    "START_GAME": [
        ({ UI }) => UI.startGame(),
        ({ notify, UI }, gameState) => {
            require('./highestRollingPlayerGoesFirst')({ notify, UI}, gameState);
            notify("PLAYER_ORDER_CHANGED");
        },
        ({ notify }) => notify("START_TURN"), // require('./playerTurnsStart')
    ],
    "START_TURN": [
        ({ notify }, gameState) => { 
            require('./resetTurnAssociatedValues')
            ({ //(require('./Defaults/turnValues')),
            speedingCounter: 0
            })(gameState);
            notify("TURN_VALUES_RESET");
        },
        ({ UI }, gameState) => UI.startTurn(gameState.currentPlayer),
        ({ notify }) => notify("CONTINUE_TURN"),
    ],
    "CONTINUE_TURN": [
        ({ notify, UI }, gameState) => {
            const action = require('../PlayerActions').prompt({ notify, UI }, gameState);
            if (action) {
                notify(action);
            } else {
                UI.unknownAction();
                notify("CONTINUE_TURN");
            }
        }
    ],
    "ROLL_DICE": [
        ({ UI }) => UI.rollingDice(),
        ({ notify }, gameState) => { 
            require('./updateTurnValues')
            ({
                roll: require('../Components/Dice').roll({ quantity: 2 })
            })(gameState);
            notify("TURN_VALUES_UPDATED");
        },
        ({ UI }, { turnValues }) => UI.diceRollResults(turnValues.roll[0], turnValues.roll[1]),
        function conditionalEventsOnDiceRolled ({ notify }, gameState) {
            if (gameState.currentPlayer.jailed >= 0) {
                notify("JAIL_ROLL");
            } else {
                notify("MOVE_ROLL");
            }
        },
        ({ notify }) => notify("CONTINUE_TURN")
    ],
    "MOVE_ROLL": [
        ({ UI }) => UI.rollNormalDice(),
        ({ notify }, gameState) => { 
            const [roll1, roll2] = gameState.turnValues.roll; 
            const isDoubles = roll1 === roll2;
            require('./updateTurnValues')
            ({
                // reset to 0 because refresh actions checks speeding counter
                speedingCounter: isDoubles ? gameState.turnValues.speedingCounter + 1 : 0
            })(gameState);
            notify("TURN_VALUES_UPDATED");
        },
        function conditionalEventsOnSpeeding ({ notify }, gameState) {
            if (gameState.turnValues.speedingCounter > 2) {
                notify("SPEEDING");
            } else {
                notify("MOVE_PLAYER");
            }
        },
    ],
    "JAIL_ROLL": [
        ({ UI }) => UI.rollJailDice(),
        (_, gameState) => {
            const [roll1, roll2] = gameState.turnValues.roll; 
            const isDoubles = roll1 === roll2;
            gameState.currentPlayer.jailed = isDoubles ? -1 : gameState.currentPlayer.jailed + 1;
        },
        ({ notify }, gameState) => {
            if(gameState.currentPlayer.jailed > 2) {
                notify("PAY_FINE");
            }
        },
        ({ notify }, gameState) => {
            if(gameState.currentPlayer.jailed === -1) {
                notify("MOVE_PLAYER");
            }
        },
    ],
    "END_TURN": [
        ({ UI }) => UI.endTurn(),
        (_, gameState) => gameState.turn++,
        ({ notify }) => notify("START_TURN")
    ],
    "PAY_FINE": [
        ({ UI }) => UI.payFine(),
        // TODO: WealthService
        (_, gameState) => {
            const FINE = 50;
            gameState.currentPlayer.cash -= FINE;
            gameState.currentPlayer.jailed = -1;
            // TODO: investigate using setter for bankruptcy logic
        },
        function conditionalEventsOnLostWealth ({ notify }, gameState) {
            // REVISIT: NETWORTH
            // if (gameState.currentPlayer.cash < 0 && gameState.currentPlayer.netWorth < Math.abs(gameState.currentPlayer.cash)) {
            if (gameState.currentPlayer.netWorth < Math.abs(gameState.currentPlayer.cash)) {
                notify("BANKRUPTCY");
            } else if (gameState.currentPlayer.cash < 0) {
            // UI: show liquidation menu
            // TODO: KENTINUE
                notify("LIQUIDATION");
            }
            // UI: disable action
        },
        ({ notify }) => notify("CONTINUE_TURN")
    ],
    //   BUY_PROPERTY: () => {},
    //   PAY_RENT,
    //   BANKRUPTCY: bankruptcy,
    //   // potentially Chance/Community Cards
};
