const { PropertyService } = require("./PropertyService");

/**
 * Responsibility:
 *   Global events for the game; events have an effect on the game world.
 */
module.exports = function (eventBus, userInterface, gameState) {
  return {
    START_GAME: startGame,
    // END_GAME,
    START_TURN: startTurn,
    CONTINUE_TURN: continueTurn,
    // TRADE,
    // PROPERTY_DEVELOPMENT,
    // AUCTION,
    DICE_ROLLED: diceRolled,
    MOVE_PLAYER: movePlayer,
    PASS_GO: passGo,
    SPEEDING: speeding,
    JAIL: jail,
  };

  // ======================================FUNCTIONS======================================

  function startTurn() {
    console.log("\n");
    const player = gameState.currentPlayer;
    // TODO: refactor to setup function
    gameState.turnTaken = false;
    gameState.speedingCounter = 0;
    userInterface.startTurn(player);

    eventBus.emit("CONTINUE_TURN");
  }

  function continueTurn() {
    const player = gameState.currentPlayer;
    const actions = (gameState.currentPlayerActions = refreshActions(
      player,
      gameState
    ));

    userInterface.displayAvailableActions(actions);
    const answer = userInterface.prompt(
      `What action would you like to take?\n\n`
    );
    // validate answer
    const desiredAction = Object.keys(actions).find(
      (a) => a === String(answer).toUpperCase()
    );
    if (desiredAction) {
      actions[desiredAction].execute();
    } else {
      console.log("ACTION DOESN'T EXIST");
    }
  }

  function refreshActions(player, gameState) {
    // determine available actions
    const actions = gameState.allPlayerActions;
    console.log("\n");
    Object.keys(gameState.allPlayerActions).forEach((action) => {
      const isAvailableAction = actions[action].isAvailable(player, gameState);
      actions[action].toggleDisplay(isAvailableAction);
      if (!isAvailableAction) delete actions[action];
    });
    console.log("\n");
    return actions;
  }

  function diceRolled([roll1, roll2]) {
    // dirty the turnTaken flag for end turn
    gameState.turnTaken = true;
    userInterface.diceRollResults(roll1, roll2);
    gameState.lastRoll = roll1 + roll2;
    const isDoubles = roll1 === roll2;

    if (gameState.currentPlayer.jailed >= 0) {
      diceRolledJail(isDoubles);
    } else {
      diceRolledNormal(isDoubles);
    }
  }

  function diceRolledJail(isDoubles) {
    userInterface.rollJailDice();
    if (isDoubles) {
      gameState.currentPlayer.jailed = -1;
      eventBus.emit("MOVE_PLAYER", gameState.lastRoll);
    } else {
      gameState.currentPlayer.jailed++;
      if (gameState.currentPlayer.jailed > 2) {
        eventBus.emit("ENFORCE_PAY_FINE");
      }
    }
  }

  function diceRolledNormal(isDoubles) {
    userInterface.rollNormalDice();
    // reset to 0 because refresh actions checks speeding counter
    gameState.speedingCounter = isDoubles ? gameState.speedingCounter + 1 : 0;

    if (gameState.speedingCounter === 3) {
      eventBus.emit("SPEEDING");
    } else {
      eventBus.emit("MOVE_PLAYER", gameState.lastRoll);
    }
  }

  function speeding() {
    userInterface.caughtSpeeding();
    eventBus.emit("JAIL");
  }

  function movePlayer(moveSpace) {
    const futurePosition = gameState.currentPlayer.position + moveSpace;
    userInterface.playerMovement(futurePosition);
    if (futurePosition > PropertyService.properties.length - 1) {
      eventBus.emit("PASS_GO");
      // UI: spin token
    }

    const tilePosition = (gameState.currentPlayer.position =
      futurePosition % PropertyService.properties.length);
    // UI: move token

    PropertyService.landOn(tilePosition);
    eventBus.emit("CONTINUE_TURN");
  }

  function passGo() {
    userInterface.passGo();
    gameState.currentPlayer.cash += 200;
  }

  // TODO: KENTINUE
  // function bankruptcy() {
  // gameState.currentPlayerActions["END_TURN"].execute()
  // }

  function jail() {
    userInterface.jail();
    gameState.currentPlayer.jailed = 0;
    gameState.currentPlayer.position = PropertyService.properties.find(
      (prop) => prop.id === "jail"
    ).position;
    // immediately end turn
    gameState.currentPlayerActions["END_TURN"].execute();
  }

  function startGame() {
    userInterface.startGame();
    // select board, select # of players, define players
    // REVISIT: start a new game from an existing one?
    eventBus.emit("START_TURN");
  }
};
