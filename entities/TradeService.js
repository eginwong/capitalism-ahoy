const { cloneDeep } = require('lodash');
const PropertyManagementService = require('./PropertyManagementService');
const WealthService = require('./WealthService');
const Errors = require('./Errors');

module.exports = class TradeService {
  // returns { player, details: { askingFor: [], receiving: [] }} OR nothing?
  static trade(UI, gameState) {
    const { NEW, CANCEL, OFFER, ACCEPT } = TradeService.TradeStatus;

    const getPlayerPropertiesForTrade = PropertyManagementService.getPlayerPropertiesForTrade.bind(
      PropertyManagementService,
      gameState
    );

    const players = gameState.players
      .filter((p) => !p.bankrupt)
      .map((p) => [p, getPlayerPropertiesForTrade(p)])
      .map(([p, { tradeableProps, untradeableProps }]) => ({
        ...p,
        tradeableProps,
        untradeableProps,
      }));

    const sourcePlayer = players.find(
      (p) => p.id === gameState.currentPlayer.id
    );

    const eligiblePlayers = players.filter((p) => p.id !== sourcePlayer.id);

    // select player menu
    UI.showPlayerTradeTable(players);
    let tradeDetails = {
      status: NEW,
      [sourcePlayer.id]: [],
    };

    while (tradeDetails.status === NEW) {
      const playerSelection = UI.promptSelect(
        eligiblePlayers.map((a) => a.name),
        'Which player would you like to trade with?',
        eligiblePlayers
      );

      if (!~playerSelection) return;

      const tradingPartner = eligiblePlayers[playerSelection];
      tradeDetails = {
        ...tradeDetails,
        [tradingPartner.id]: [],
      };

      // initial trade state
      let playerContext = {};
      let targetPlayer = {};

      const isInitiatingPlayer = () => playerContext.id === sourcePlayer.id;

      do {
        let isInitiatingPlayerInitiator = isInitiatingPlayer();
        playerContext = isInitiatingPlayerInitiator
          ? tradingPartner
          : sourcePlayer;
        targetPlayer = isInitiatingPlayerInitiator
          ? sourcePlayer
          : tradingPartner;
        UI.playerTradeAction(playerContext);

        const tempTradeDetails = TradeService.determineTradeAssets(
          UI,
          gameState,
          playerContext,
          targetPlayer,
          tradeDetails
        );

        switch (tempTradeDetails.status) {
          case CANCEL:
            if (isInitiatingPlayer()) tradeDetails.status = NEW; // to start over
            break;
          case OFFER:
            tradeDetails = {
              ...tradeDetails, // for future-proofing
              [sourcePlayer.id]: tempTradeDetails[sourcePlayer.id],
              [tradingPartner.id]: tempTradeDetails[tradingPartner.id],
              status: OFFER,
            };
            break;
          case ACCEPT:
            tradeDetails.status = ACCEPT;
            break;
        }
      } while (tradeDetails.status === OFFER);
    }

    return tradeDetails;
  }

  static help(UI) {
    UI.tradeInstructions();
  }

  static info(UI, currentPlayerId, sourcePlayer, targetPlayer, tradeDetails) {
    UI.showPlayerTradeTable([sourcePlayer, targetPlayer]);
    UI.displayTradeDetails(
      currentPlayerId,
      sourcePlayer,
      targetPlayer,
      tradeDetails
    );
  }

  static cancel(tradeDetails) {
    tradeDetails.status = TradeService.TradeStatus.CANCEL;
    return true; // required for prompt cl loop
  }

  static confirm(UI, gameState, sourcePlayer, targetPlayer, tradeDetails) {
    const { OFFER, ACCEPT } = TradeService.TradeStatus;

    UI.displayTradeDetails(
      gameState.currentPlayer.id,
      sourcePlayer,
      targetPlayer,
      tradeDetails
    );

    const validations = [
      () =>
        tradeDetails[sourcePlayer.id].length === 0
          ? Errors.NO_OFFERED_ASSETS_IN_TRADE
          : null,
      () =>
        tradeDetails[targetPlayer.id].length === 0
          ? Errors.NO_REQUESTED_ASSETS_IN_TRADE
          : null,
      () => {
        const gettingInTrade = tradeDetails[targetPlayer.id];
        const propertiesGettingInTrade = gettingInTrade.filter((p) => p.id);
        const cashGettingInTrade = gettingInTrade.find(
          (a) => typeof a === 'number'
        );
        const givingAwayInTrade = tradeDetails[sourcePlayer.id];
        const propertiesGivingAwayInTrade = givingAwayInTrade.filter(
          (p) => p.id
        );
        const cashGivingAwayInTrade = givingAwayInTrade.find(
          (a) => typeof a === 'number'
        );

        // nothing is mortgaged so no concern here
        if (
          !propertiesGettingInTrade.some((p) => p.mortgaged) &&
          !propertiesGivingAwayInTrade.some((p) => p.mortgaged)
        )
          return false;

        const sourceLiquidity =
          WealthService.calculateLiquidity(
            gameState,
            [...sourcePlayer.untradeableProps, ...propertiesGettingInTrade],
            sourcePlayer
          ) +
          (cashGettingInTrade || 0) -
          (cashGivingAwayInTrade || 0);

        const sourceCost = propertiesGettingInTrade
          .filter((p) => p.mortgaged)
          .reduce(
            (acc, prop) =>
              acc +
              (prop.price /
                gameState.config.propertyConfig.mortgageValueMultiplier) *
                gameState.config.propertyConfig.interestRate,
            0
          );

        const targetLiquidity =
          WealthService.calculateLiquidity(
            gameState,
            [...targetPlayer.untradeableProps, ...propertiesGivingAwayInTrade],
            targetPlayer
          ) +
          (cashGivingAwayInTrade || 0) -
          (cashGettingInTrade || 0);

        const targetCost = propertiesGivingAwayInTrade
          .filter((p) => p.mortgaged)
          .reduce(
            (acc, prop) =>
              acc +
              (prop.price /
                gameState.config.propertyConfig.mortgageValueMultiplier) *
                gameState.config.propertyConfig.interestRate,
            0
          );
        const isBankrupt =
          sourceLiquidity < sourceCost || targetLiquidity < targetCost;
        return isBankrupt ? Errors.BANKRUPTCY_IN_TRADE : null;
      },
    ];

    const validationResults = validations.map((v) => v()).filter((v) => v);
    if (validationResults.length > 0) {
      UI.tradeError(validationResults);
      return;
    }

    if (UI.promptConfirm('Confirm Trade?')) {
      tradeDetails.status = tradeDetails.status === OFFER ? ACCEPT : OFFER;
      return true; // required for prompt cl loop
    }
  }

  static request(
    UI,
    sourcePlayer,
    targetPlayer,
    originalTradeDetails,
    currentTradeDetails
  ) {
    const { CARD, CASH, PROPERTY } = TradeService.AssetType;
    const assetAttribute = sourcePlayer.id;
    const oppositeAssetAttribute = targetPlayer.id;

    let tradeableAssets = [
      ...targetPlayer.tradeableProps.map((a) => ({
        display: UI.mapPropertyShortDisplay(a),
        selected: false,
        type: PROPERTY,
        value: a,
      })),
      ...targetPlayer.cards.map((c) => ({
        display: `🃏 ${c.title}`,
        selected: false,
        type: CARD,
        value: c,
      })),
      {
        display: `Cash: $0/$${targetPlayer.cash}`,
        selected: false,
        type: CASH,
        value: 0,
      },
    ];

    currentTradeDetails[assetAttribute].forEach((a) => {
      const assetType = a.id ? PROPERTY : a.action ? CARD : CASH;
      let requestedAsset;
      switch (assetType) {
        case PROPERTY:
          requestedAsset = tradeableAssets.find(
            (ta) => ta.type === assetType && ta.value.id === a.id
          );
          requestedAsset.selected = true;
          break;
        case CARD:
          requestedAsset = tradeableAssets.find(
            (ta) =>
              ta.type === assetType &&
              ta.value.action === a.action &&
              ta.value.type === a.type
          );
          requestedAsset.selected = true;
          break;
        default:
          requestedAsset = tradeableAssets.find((ta) => ta.type === assetType);
          requestedAsset.selected = true;
          requestedAsset.display = `$${a}/$${targetPlayer.cash}`;
          requestedAsset.value = a;
          break;
      }
    });

    let assetNum = -1;
    do {
      if (~assetNum) {
        tradeableAssets[assetNum].selected = !tradeableAssets[assetNum]
          .selected;
        let chosenAsset = tradeableAssets[assetNum];
        if (chosenAsset.type === CASH) {
          if (chosenAsset.selected) {
            let desiredCash = 0;
            do {
              desiredCash = UI.promptNumber(
                `How much cash? Maximum available is $${targetPlayer.cash} \n`
              );
            } while (desiredCash > targetPlayer.cash || desiredCash === 0);
            chosenAsset.display = `$${desiredCash}/$${targetPlayer.cash}`;
            chosenAsset.value = desiredCash;
          } else {
            chosenAsset.display = `$0/$${targetPlayer.cash}`;
          }
        }
      }
      assetNum = UI.promptSelect(
        tradeableAssets.map((ta) => `${ta.selected ? '✅' : ''} ${ta.display}`),
        `Select the asset you would like to include in the trade.`
      );
    } while (assetNum !== -1);

    const selectedAssets = tradeableAssets.filter((ta) => ta.selected);
    currentTradeDetails[assetAttribute] = selectedAssets.map((ta) => ta.value);

    // remove cash from alternate request/offer if cash was added
    if (selectedAssets.some((a) => a.type === CASH)) {
      currentTradeDetails[oppositeAssetAttribute] = currentTradeDetails[
        oppositeAssetAttribute
      ].filter((a) => typeof a !== 'number');
    }

    if (
      JSON.stringify(originalTradeDetails) !==
      JSON.stringify(currentTradeDetails)
    ) {
      currentTradeDetails.status = TradeService.TradeStatus.NEW;
    }
  }

  static determineTradeAssets(
    UI,
    gameState,
    sourcePlayer,
    targetPlayer,
    tradeDetails
  ) {
    let interactiveTradeDetails = cloneDeep(tradeDetails);
    const currentPlayerId = gameState.currentPlayer.id;

    UI.tradeIntroduction();
    UI.displayTradeDetails(
      currentPlayerId,
      sourcePlayer,
      targetPlayer,
      interactiveTradeDetails
    );

    /* istanbul ignore next */
    UI.promptCLLoop({
      help: () => TradeService.help(UI),
      info: () =>
        TradeService.info(
          UI,
          currentPlayerId,
          sourcePlayer,
          targetPlayer,
          interactiveTradeDetails
        ),
      request: () =>
        TradeService.request(
          UI,
          sourcePlayer,
          targetPlayer,
          tradeDetails,
          interactiveTradeDetails
        ),
      offer: () =>
        TradeService.request(
          UI,
          targetPlayer,
          sourcePlayer,
          tradeDetails,
          interactiveTradeDetails
        ),
      confirm: () =>
        TradeService.confirm(
          UI,
          gameState,
          sourcePlayer,
          targetPlayer,
          interactiveTradeDetails
        ),
      cancel: () => TradeService.cancel(interactiveTradeDetails),
    });

    return interactiveTradeDetails;
  }

  static TradeStatus = {
    NEW: 'new',
    CANCEL: 'cancel',
    OFFER: 'offer',
    ACCEPT: 'accept',
  };

  static AssetType = {
    CASH: 'cash',
    CARD: 'card',
    PROPERTY: 'property',
  };
};
