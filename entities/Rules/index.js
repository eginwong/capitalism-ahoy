/**
 * Responsibility: Define the Rules for the Game
 * 
 * Note: All rules have base type Func<{ notify, UI }, gameState>
 */
module.exports = [
    {
        condition: "START_GAME",
        rules: [
            ({ UI }) => UI.startGame(),
            require('./highestRollingPlayerGoesFirst'),
            ({ notify }) => notify("START_TURN"), // require('./playerTurnsStart')
        ]
    },
    {
        condition: "START_TURN",
        rules: [
            require('./resetTurnAssociatedValues')(require('./Defaults/turnValues')),
            ({ UI }, gameState) => UI.startTurn(gameState.currentPlayer),
            ({ notify }) => notify("CONTINUE_TURN"),
        ]
    },
    {
        condition: "CONTINUE_TURN",
        rules: [
            function promptForPlayerAction ({ UI, notify }, { turnValues }) {
                const { actions } = turnValues;
                UI.displayAvailableActions(actions);

                // TODO: UI.prompt -> UI.selectFrom(actions: [String], msg: String) : String | String `el` <actions>
                const answer = UI.prompt(
                    `Which action would you like to take?\n\n`
                );
                const desiredAction = actions.find(
                    action => action === String(answer).toUpperCase()
                );

                if (desiredAction) {
                    notify(desiredAction);
                } else {
                    UI.unknownAction();
                    notify("CONTINUE_TURN");
                }
            }
        ]
    },
    {
        condition: "ROLL_DICE",
        rules: [
            ({ UI }) => UI.rollingDice(),
            require('./rollDice'),
            require('./updateTurnValues')({ actionTaken: true })
        ]
    },
    {
        condition: "DICE_ROLLED",
        rules: [
            ({ UI }, { turnValues }) => UI.diceRollResults(turnValues.roll[0], turnValues.roll[1]),
            ({ notify }) => notify("CONTINUE_TURN")
        ]
    }
];
