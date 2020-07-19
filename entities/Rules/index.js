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
        require('./resetTurnAssociatedValues')({ //(require('./Defaults/turnValues')),
            speedingCounter: 0
        }),
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
        // TODO: Switch to Adapter Pattern; migrate logic back to rollDice
        require('./updateTurnValues')((dice = require('../Components/Dice')) => 
            ({ roll: dice.roll({ quantity: 2 }) })
        ),
        // require('./rollDice'),
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
};
