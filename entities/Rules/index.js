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
    (_, gameState) => {
      const { chanceConfig, communityChestConfig } = gameState.config;
      chanceConfig.availableCards = require('../Components/Deck').shuffle(
        chanceConfig.availableCards
      );
      communityChestConfig.availableCards = require('../Components/Deck').shuffle(
        communityChestConfig.availableCards
      );
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
    ({ UI, notify }, gameState) => {
      if (gameState.currentPlayer.bankrupt) {
        UI.skipTurnForBankruptPlayer(gameState.currentPlayer);
        notify('END_TURN');
      }
    },
    (_, gameState) =>
      (gameState.currentBoardProperty = require('../PropertyManagementService').getCurrentPlayerBoardProperty(
        gameState
      )),
    ({ UI }, gameState) => UI.playerDetails(gameState.currentPlayer),
    ({ notify }, gameState) => {
      if (gameState.gameOver) {
        notify('END_GAME');
      } else {
        notify('CONTINUE_TURN');
      }
    },
  ],
  CONTINUE_TURN: [
    ({ notify, UI }, gameState) => {
      const action = require('../PlayerActions').select(
        UI,
        require('../PlayerActions').refresh(gameState),
        {
          cancel: false,
        }
      );
      notify(action);

      if (action === 'END_TURN' || action === 'END_GAME') return;

      // check if we can end turn or continue turn here
      const newlyInJail =
        gameState.turnValues.roll && gameState.currentPlayer.jailed === 0;
      if (
        newlyInJail ||
        gameState.currentPlayer.bankrupt ||
        gameState.gameOver
      ) {
        notify('END_TURN');
      } else {
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
      if (
        gameState.currentPlayer.jailed === -1 &&
        !gameState.currentPlayer.bankrupt
      ) {
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
    ({ notify }, gameState) => {
      let player = gameState.currentPlayer;
      if (player.cash < gameState.config.fineAmount) {
        require('./updateTurnValues')({
          subTurn: {
            playerId: player.id,
            charge: gameState.config.fineAmount,
          },
        })(gameState);
        notify('TURN_VALUES_UPDATED');

        notify('COLLECTIONS');
      }

      require('../WealthService').decrement(
        player,
        gameState.config.fineAmount
      );
      player.jailed = -1;
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
    ({ UI, notify }, gameState) => {
      const finishGame =
        gameState.gameOver ||
        require('../PlayerActions').confirm(
          UI,
          'Are you sure you want to end the game?'
        );
      if (!finishGame) {
        notify('CONTINUE_TURN');
        return;
      }

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
        notify('AUCTION');
      } else {
        const action = require('../PlayerActions').select(
          UI,
          ['BUY_PROPERTY', 'AUCTION'],
          {
            cancel: false,
          }
        );

        notify(action);
      }
    },
  ],
  BUY_PROPERTY: [
    ({ UI, notify }, gameState) => {
      const boardProperty = gameState.currentBoardProperty;
      let player = gameState.currentPlayer;

      if (player.cash < boardProperty.price) {
        require('./updateTurnValues')({
          subTurn: {
            playerId: player.id,
            charge: boardProperty.price,
          },
        })(gameState);
        notify('TURN_VALUES_UPDATED');

        notify('COLLECTIONS');
      }

      if (player.bankrupt) return;

      require('../WealthService').buyAsset(player, boardProperty.price);

      require('../PropertyManagementService').changeOwner(
        boardProperty,
        player.id
      );

      UI.propertyBought();
    },
  ],
  PAY_RENT: [
    ({ UI, notify }, gameState) => {
      const boardProperty = gameState.currentBoardProperty;
      const owner = gameState.players.find(
        (p) => p.id === boardProperty.ownedBy
      );
      let player = gameState.currentPlayer;

      const rentAmount = require('../PropertyManagementService').calculateRent(
        gameState,
        boardProperty
      );

      if (player.cash < rentAmount) {
        require('./updateTurnValues')({
          subTurn: {
            playerId: player.id,
            charge: rentAmount,
          },
        })(gameState);
        notify('TURN_VALUES_UPDATED');

        notify('COLLECTIONS');
      }

      // pay out what cash is leftover
      let actualRentAmount =
        rentAmount < player.cash ? rentAmount : player.cash;
      require('../WealthService').exchange(player, owner, actualRentAmount);

      UI.payingRent(player, owner, rentAmount);
    },
  ],
  MANAGE_PROPERTIES: [
    // TODO: potentially refactor this prompt pattern
    ({ notify, UI }, gameState) => {
      const action = require('../PlayerActions').select(
        UI,
        require('../PropertyManagementService').getAvailableManagementActions(
          gameState
        )
      );

      if (action === 'CANCEL') return;

      notify(action);
      notify('MANAGE_PROPERTIES');
    },
  ],
  RENOVATE: [
    ({ notify, UI }, gameState) => {
      const renoProps = require('../PropertyManagementService').getRenoProperties(
        gameState
      );

      const renoProp = require('../PlayerActions').selectProperties(
        UI,
        renoProps
      );

      if (renoProp === 'CANCEL') return;
      require('../PropertyManagementService').renovate(gameState, renoProp);

      notify('RENOVATE');
    },
  ],
  DEMOLISH: [
    ({ notify, UI }, gameState) => {
      const demoProps = require('../PropertyManagementService').getDemoProperties(
        gameState
      );

      const demoProp = require('../PlayerActions').selectProperties(
        UI,
        demoProps
      );

      if (demoProp === 'CANCEL') return;
      require('../PropertyManagementService').demolish(gameState, demoProp);

      notify('DEMOLISH');
    },
  ],
  MORTGAGE: [
    ({ notify, UI }, gameState) => {
      // can only mortgage or unmortgage properties with 0 buildings
      const mortgageAbleProps = require('../PropertyManagementService')
        .getMortgageableProperties(gameState)
        .filter((p) => !p.mortgaged);

      const propSelection = require('../PlayerActions').selectProperties(
        UI,
        mortgageAbleProps
      );

      if (propSelection === 'CANCEL') return;
      require('../PropertyManagementService').mortgage(
        gameState,
        propSelection
      );

      notify('MORTGAGE');
    },
  ],
  UNMORTGAGE: [
    ({ notify, UI }, gameState) => {
      const player = gameState.currentPlayer;
      const {
        interestRate,
        mortgageValueMultiplier,
      } = gameState.config.propertyConfig;

      const INTEREST_RATE_MULTIPLIER = 1 + interestRate;
      // can only mortgage or unmortgage properties with 0 buildings
      const unmortgageAbleProps = require('../PropertyManagementService')
        .getMortgageableProperties(gameState)
        .filter((p) => p.mortgaged);

      const propSelection = require('../PlayerActions').selectProperties(
        UI,
        unmortgageAbleProps
      );

      if (propSelection === 'CANCEL') return;

      if (
        propSelection.mortgaged &&
        player.cash <
          (propSelection.price / mortgageValueMultiplier) *
            INTEREST_RATE_MULTIPLIER
      ) {
        UI.noCashMustLiquidate(gameState.currentPlayer);
      } else {
        require('../PropertyManagementService').unmortgage(
          gameState,
          propSelection
        );
      }

      notify('UNMORTGAGE');
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
          const { luxuryTaxAmount } = gameState.config;
          let player = gameState.currentPlayer;

          if (player.cash < luxuryTaxAmount) {
            require('./updateTurnValues')({
              subTurn: {
                playerId: player.id,
                charge: luxuryTaxAmount,
              },
            })(gameState);
            notify('TURN_VALUES_UPDATED');

            notify('COLLECTIONS');
          }

          if (player.bankrupt) return;

          require('../WealthService').decrement(player, luxuryTaxAmount);
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
      const {
        FIXED_INCOME_TAX,
        VARIABLE_INCOME_TAX,
      } = require('../PropertyManagementService');
      const { incomeTaxAmount, incomeTaxRate } = gameState.config;
      const player = gameState.currentPlayer;

      const paymentSelection = require('../PlayerActions').select(
        UI,
        [FIXED_INCOME_TAX, VARIABLE_INCOME_TAX],
        {
          cancel: false,
        }
      );

      if (paymentSelection === FIXED_INCOME_TAX) {
        if (player.cash < incomeTaxAmount) {
          require('./updateTurnValues')({
            subTurn: {
              playerId: player.id,
              charge: incomeTaxAmount,
            },
          })(gameState);
          notify('TURN_VALUES_UPDATED');

          notify('COLLECTIONS');
        }
        if (player.bankrupt) return;

        require('../WealthService').decrement(player, incomeTaxAmount);
        UI.incomeTaxPaid(incomeTaxAmount);
      } else {
        const netWorth = require('../WealthService').calculateNetWorth(player);
        const fee = (incomeTaxRate * netWorth).toFixed(2);

        if (player.cash < fee) {
          require('./updateTurnValues')({
            subTurn: {
              playerId: player.id,
              charge: fee,
            },
          })(gameState);
          notify('TURN_VALUES_UPDATED');

          notify('COLLECTIONS');
        }
        if (player.bankrupt) return;

        require('../WealthService').decrement(player, fee);
        UI.incomeTaxPaid(fee);
      }
    },
  ],
  LIQUIDATION: [
    ({ UI, notify }) => {
      const liquidateOption = require('../PlayerActions').select(UI, [
        'MANAGE_PROPERTIES',
        'TRADE',
        'PLAYER_INFO',
      ]);

      if (liquidateOption === 'CANCEL') return;

      notify(liquidateOption);
      notify('LIQUIDATION');
    },
  ],
  CHANCE: [
    ({ UI, notify }, gameState) => {
      const { draw, replaceAvailableCards } = require('../Components/Deck');
      const pmsService = require('../PropertyManagementService');
      const wealthService = require('../WealthService');
      const player = gameState.currentPlayer;
      if (gameState.config.chanceConfig.availableCards.length === 0) {
        gameState.config.chanceConfig = replaceAvailableCards(
          gameState.config.chanceConfig
        );
      }
      let cardConfig = gameState.config.chanceConfig;
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
          const houses = pmsService.getConstructedHouses(gameState);
          const hotels = pmsService.getConstructedHotels(gameState);
          const charge = houses * card.buildings + hotels * card.hotels;

          if (player.cash < charge) {
            require('./updateTurnValues')({
              subTurn: {
                playerId: player.id,
                charge,
              },
            })(gameState);
            notify('TURN_VALUES_UPDATED');

            notify('COLLECTIONS');
          }
          if (player.bankrupt) return;

          wealthService.decrement(player, charge);
          break;
        }
        case 'removefunds': {
          if (player.cash < card.amount) {
            require('./updateTurnValues')({
              subTurn: {
                playerId: player.id,
                charge: card.amount,
              },
            })(gameState);
            notify('TURN_VALUES_UPDATED');

            notify('COLLECTIONS');
          }
          if (player.bankrupt) return;

          wealthService.decrement(player, card.amount);
          break;
        }
        case 'removefundstoplayers': {
          for (let i = 0; i < gameState.players.length; i++) {
            if (
              gameState.players[i].id !== player.id &&
              !gameState.players[i].bankrupt
            ) {
              if (player.cash < card.amount) {
                require('./updateTurnValues')({
                  subTurn: {
                    playerId: player.id,
                    charge: card.amount,
                  },
                })(gameState);
                notify('TURN_VALUES_UPDATED');

                notify('COLLECTIONS');
              }
              let amountOwed =
                card.amount < player.cash ? card.amount : player.cash;
              wealthService.exchange(player, gameState.players[i], amountOwed);
            }
          }
          break;
        }
      }
      cardConfig.discardedCards = require('../Components/Deck').discard(
        card,
        cardConfig.discardedCards
      );
    },
  ],
  COMMUNITY_CHEST: [
    ({ UI, notify }, gameState) => {
      const { draw, replaceAvailableCards } = require('../Components/Deck');
      const pmsService = require('../PropertyManagementService');
      const wealthService = require('../WealthService');
      const player = gameState.currentPlayer;
      if (gameState.config.communityChestConfig.availableCards.length === 0) {
        gameState.config.communityChestConfig = replaceAvailableCards(
          gameState.config.communityChestConfig
        );
      }
      let cardConfig = gameState.config.communityChestConfig;

      const { card, deck } = draw(cardConfig.availableCards);
      cardConfig.availableCards = deck;

      UI.drewCard('community chest', card);

      // do the action
      if (card.action === 'getoutofjailfree') {
        player.cards.push(card);
        return;
      }

      switch (card.action) {
        case 'move': {
          const targetPosition = pmsService.findProperty(gameState, card.tileid)
            .position;
          const finalPosition =
            targetPosition + pmsService.getProperties(gameState).length;
          player.position = finalPosition;

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
          const houses = pmsService.getConstructedHouses(gameState);
          const hotels = pmsService.getConstructedHotels(gameState);
          const charge = houses * card.buildings + hotels * card.hotels;

          if (player.cash < charge) {
            require('./updateTurnValues')({
              subTurn: {
                playerId: player.id,
                charge,
              },
            })(gameState);
            notify('TURN_VALUES_UPDATED');

            notify('COLLECTIONS');
          }

          if (gameState.currentPlayer.bankrupt) return;

          wealthService.decrement(player, charge);
          break;
        }
        case 'removefunds': {
          if (player.cash < card.amount) {
            require('./updateTurnValues')({
              subTurn: {
                playerId: player.id,
                charge: card.amount,
              },
            })(gameState);
            notify('TURN_VALUES_UPDATED');

            notify('COLLECTIONS');
          }
          if (player.bankrupt) return;

          wealthService.decrement(player, card.amount);
          break;
        }
        case 'addfundsfromplayers': {
          for (let i = 0; i < gameState.players.length; i++) {
            let targetPlayer = gameState.players[i];

            if (targetPlayer.id !== player.id && !targetPlayer.bankrupt) {
              if (targetPlayer.cash < card.amount) {
                require('./updateTurnValues')({
                  subTurn: {
                    playerId: targetPlayer.id,
                    charge: card.amount,
                  },
                })(gameState);
                notify('TURN_VALUES_UPDATED');

                notify('COLLECTIONS');
              }

              let amountOwed =
                card.amount < targetPlayer.cash
                  ? card.amount
                  : targetPlayer.cash;
              wealthService.exchange(targetPlayer, player, amountOwed);
            }
          }
          break;
        }
      }
      cardConfig.discardedCards = require('../Components/Deck').discard(
        card,
        cardConfig.discardedCards
      );
    },
  ],
  USE_GET_OUT_OF_JAIL_FREE_CARD: [
    ({ UI }) => UI.getOutOfJailFreeCardUsed(),
    (_, gameState) => {
      gameState.currentPlayer.jailed = -1;
      const card = gameState.currentPlayer.cards.pop();
      const { chanceConfig, communityChestConfig } = gameState.config;

      if (card.type === 'chance') {
        chanceConfig.discardedCards = require('../Components/Deck').discard(
          card,
          chanceConfig.discardedCards
        );
      }
      if (card.type === 'communitychest') {
        communityChestConfig.discardedCards = require('../Components/Deck').discard(
          card,
          communityChestConfig.discardedCards
        );
      }
    },
  ],
  //   TRADE,
  AUCTION: [
    ({ UI }) => UI.auctionInstructions(),
    ({ UI, notify }, gameState) => {
      const { calculateLiquidity } = require('../WealthService');
      const boardProperty = gameState.currentBoardProperty;
      const {
        mortgageValueMultiplier,
        interestRate,
      } = gameState.config.propertyConfig;
      const mortgageFee = boardProperty.mortgaged
        ? interestRate * boardProperty.price
        : 0;

      // HOUSE RULE: Pay the max of either the 10% fee for interest of a mortgaged property or the minimum cost
      const baseCost = Math.max(
        mortgageFee,
        gameState.config.propertyConfig.minimumPropertyPrice
      );

      const availablePlayers = gameState.players
        .filter((p) => !p.bankrupt)
        .map((player) => ({
          ...player,
          liquidity: calculateLiquidity(
            gameState,
            gameState.config.propertyConfig.properties,
            player
          ),
        }))
        .filter((p) => p.liquidity >= baseCost);

      let { buyer, price } =
        availablePlayers.length > 1
          ? require('../PlayerActions').auction(
              UI,
              availablePlayers,
              boardProperty,
              baseCost
            )
          : { buyer: availablePlayers[0], price: baseCost };
      UI.wonAuction(buyer, price);

      if (buyer.cash < price) {
        require('./updateTurnValues')({
          subTurn: {
            playerId: buyer.id,
            charge: price,
          },
        })(gameState);
        notify('TURN_VALUES_UPDATED');

        notify('COLLECTIONS');
      }

      // need to reset values of winning player, otherwise the collections are not persisted
      let winningPlayer = gameState.players.find((p) => p.id === buyer.id);
      const boardPropertyMortgagePrice =
        boardProperty.price / mortgageValueMultiplier;

      require('../WealthService').buyAsset(
        winningPlayer,
        price,
        boardProperty.mortgaged
          ? boardPropertyMortgagePrice
          : boardProperty.price
      );

      const winnerHasFundsToUnmortgage =
        buyer.liquidity - price > boardPropertyMortgagePrice;
      if (boardProperty.mortgaged && winnerHasFundsToUnmortgage) {
        const unmortgage = require('../PlayerActions').confirm(
          UI,
          `Would you like to unmortgage this property right now? If yes, you can save on the interest rate charge! The cost is $${boardPropertyMortgagePrice}`
        );

        if (unmortgage) {
          if (winningPlayer.cash < boardPropertyMortgagePrice) {
            require('./updateTurnValues')({
              subTurn: {
                playerId: winningPlayer.id,
                charge: boardPropertyMortgagePrice,
              },
            })(gameState);
            notify('TURN_VALUES_UPDATED');

            notify('COLLECTIONS');
          }

          require('../PropertyManagementService').unmortgage(
            gameState,
            boardProperty,
            false
          );
        }
      }

      require('../PropertyManagementService').changeOwner(
        boardProperty,
        winningPlayer.id
      );
    },
  ],
  COLLECTIONS: [
    ({ UI, notify }, gameState) => {
      const { subTurn } = gameState.turnValues;
      const { calculateLiquidity } = require('../WealthService');
      if (!subTurn) return;
      if (typeof subTurn.playerId !== 'number' || !subTurn.charge) return;

      let liquidity;

      while (
        gameState.currentPlayer.cash < subTurn.charge &&
        !gameState.currentPlayer.bankrupt
      ) {
        liquidity = calculateLiquidity(
          gameState,
          gameState.config.propertyConfig.properties,
          gameState.currentPlayer
        );

        if (liquidity < subTurn.charge) {
          notify('BANKRUPTCY');
        } else {
          UI.playerShortOnFunds(gameState.currentPlayer.cash, subTurn.charge);
          notify('LIQUIDATION');
        }
      }
    },
    ({ notify }, gameState) => {
      // returning to current player for regular game flow
      require('./updateTurnValues')({
        subTurn: null,
      })(gameState);
      notify('TURN_VALUES_UPDATED');
    },
  ],
  PLAYER_INFO: [
    ({ UI }, gameState) => {
      const props = require('../PropertyManagementService').getProperties(
        gameState
      );
      const { getPropertyAtPosition } = require('../BoardService');
      UI.showPlayerTable(
        gameState.players.map((p) => ({
          ...p,
          playerBoardSpace: getPropertyAtPosition(gameState, p),
          properties: props.filter((prop) => prop.ownedBy === p.id),
        }))
      );
    },
  ],
  BANKRUPTCY: [
    ({ UI }, gameState) => {
      require('../PlayerActions').prompt(
        { UI },
        'End of the line. Declare bankruptcy?'
      );
      UI.playerLost(gameState.currentPlayer);

      // must update the player from gamestate directly
      gameState.players.find(
        (p) => p.id === gameState.currentPlayer.id
      ).bankrupt = true;
      gameState.gameOver =
        gameState.players.filter((p) => !p.bankrupt).length <= 1;
    },
    (_, gameState) => {
      // discard all cards remaining
      const player = gameState.currentPlayer;
      if (player.cards.length === 0) return;

      const { chanceConfig, communityChestConfig } = gameState.config;
      while (player.cards.length > 0) {
        const card = player.cards.pop();
        if (card.type === 'chance') {
          chanceConfig.discardedCards = require('../Components/Deck').discard(
            card,
            chanceConfig.discardedCards
          );
        }
        if (card.type === 'communitychest') {
          communityChestConfig.discardedCards = require('../Components/Deck').discard(
            card,
            communityChestConfig.discardedCards
          );
        }
      }
    },
    (_, gameState) => {
      // demolish all properties
      let demoProps;
      do {
        demoProps = require('../PropertyManagementService').getDemoProperties(
          gameState
        );

        demoProps.forEach((p) =>
          require('../PropertyManagementService').demolish(gameState, p)
        );
      } while (demoProps.length !== 0);
    },
    (_, gameState) => {
      // mortgage all remaining properties
      const player = gameState.currentPlayer;
      const mortgageAbleProps = require('../PropertyManagementService')
        .getProperties(gameState)
        .filter(
          (p) => p.ownedBy === player.id && p.buildings === 0 && !p.mortgaged
        );

      for (let p of mortgageAbleProps) {
        require('../PropertyManagementService').mortgage(gameState, p);
      }
    },
    ({ notify }, gameState) => {
      // short-circuit if possible
      if (gameState.gameOver) return;

      // auction off all remaining properties
      const player = gameState.currentPlayer;
      const playerProps = require('../PropertyManagementService')
        .getProperties(gameState)
        .filter((p) => p.ownedBy === player.id);

      for (let prop of playerProps) {
        gameState.currentBoardProperty = prop;
        notify('AUCTION');
      }
    },
  ],
};
