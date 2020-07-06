// Base set of mocked UI
module.exports = function mockUIFactory () {
    return {
        startGame: () => true,
        startTurn: (player) => false,
        displayAvailableActions: (actions) => false,
        prompt: () => true,
        endTurn: () => true,
        rollingDice: () => true,
        rollDiceDisplay: (shouldDisplay) => true,
        payFineDisplay: (shouldDisplay) => true,
        endTurnDisplay: (shouldDisplay) => true,
        diceRollResults: (roll1, roll2) => true,
        rollNormalDice: () => true,
        rollJailDice: () => true,
        caughtSpeeding: () => true,
        playerMovement: (position) => true,
        payFine: () => true,
        passGo: () => true,
        jail: () => true,
        unknownAction: () => true,
    };
};
