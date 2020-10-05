const WealthService = require('./WealthService');
const { _ } = require('lodash');

/**
 * Responsibility:
 *   Defines a model and associated metadata for a property.
 */
module.exports = class PropertyManagementService {
  static getProperties(gameState) {
    return gameState.config.propertyConfig.properties;
  }

  static findProperty(gameState, id) {
    return this.getProperties(gameState).find((prop) => prop.id === id);
  }

  static getCurrentPlayerBoardProperty(gameState) {
    const position = gameState.currentPlayer.position;
    return this.getProperties(gameState).find(
      (prop) => prop.position === position
    );
  }

  static calculateRent(gameState, boardProperty) {
    let rentAmount = boardProperty.rent;
    const playerIndex = gameState.players[boardProperty.ownedBy].id;
    const {
      singleUtilityMultiplier,
      doubleUtilityMultiplier,
      railRoadPricing,
    } = gameState.config.propertyConfig;

    if (boardProperty.group === 'Utilities') {
      const totalRoll =
        gameState.turnValues.roll[0] + gameState.turnValues.roll[1];
      // check number of utilities
      const hasMonopoly = this.hasMonopoly(
        gameState,
        boardProperty.group,
        playerIndex
      );
      // multiply by roll
      rentAmount =
        totalRoll *
        (hasMonopoly ? doubleUtilityMultiplier : singleUtilityMultiplier);
    } else if (boardProperty.group === 'Railroad') {
      const railroadCount = this.getProperties(gameState)
        .filter((p) => p.group === boardProperty.group)
        .filter((p) => p.ownedBy === playerIndex).length;
      rentAmount = railRoadPricing[railroadCount - 1];
    } else {
      if (boardProperty.buildings > 0) {
        rentAmount = boardProperty.multipliedRent[boardProperty.buildings - 1];
      } else {
        const hasMonopoly = this.hasMonopoly(
          gameState,
          boardProperty.group,
          playerIndex
        );

        if (hasMonopoly) {
          rentAmount *= 2;
        }
      }
    }
    return rentAmount;
  }

  static changeOwner(boardProperty, playerId) {
    boardProperty.ownedBy = playerId;
  }

  static renovate(gameState, property) {
    const propConfig = gameState.config.propertyConfig;
    propConfig[
      property.buildings !== propConfig.numberOfHousesBeforeHotel
        ? 'houses'
        : 'hotels'
    ] -= 1;
    property.buildings += 1;
    WealthService.buyAsset(gameState.currentPlayer, property.houseCost);
  }

  static demolish(gameState, property) {
    const propConfig = gameState.config.propertyConfig;

    propConfig[
      property.buildings <= propConfig.numberOfHousesBeforeHotel
        ? 'houses'
        : 'hotels'
    ] += 1;
    property.buildings -= 1;
    WealthService.sellAsset(
      gameState.currentPlayer,
      property.houseCost / propConfig.mortgageValueMultiplier
    );
  }

  static toggleMortgageOnProperty(
    gameState,
    boardProperty,
    player = gameState.currentPlayer
  ) {
    boardProperty.mortgaged = !boardProperty.mortgaged;
    const INTEREST_RATE = gameState.config.propertyConfig.interestRate;
    const mortgageBaseCost =
      boardProperty.price /
      gameState.config.propertyConfig.mortgageValueMultiplier;

    if (boardProperty.mortgaged) {
      WealthService.sellAsset(player, mortgageBaseCost);
    } else {
      WealthService.decrement(player, mortgageBaseCost * INTEREST_RATE);
      WealthService.buyAsset(player, mortgageBaseCost);
    }
  }

  static hasMonopoly(gameState, propertyGroup, playerId) {
    return this.getProperties(gameState)
      .filter((p) => p.group === propertyGroup)
      .every((p) => p.ownedBy === playerId);
  }

  static getAvailableManagementActions(gameState) {
    let availableActions = ['TOGGLE_MORTGAGE'];

    if (this.getRenoProperties(gameState).length > 0) {
      availableActions.push('RENOVATE');
    }

    if (this.getDemoProperties(gameState).length > 0) {
      availableActions.push('DEMOLISH');
    }

    availableActions.push('CANCEL');
    return availableActions;
  }

  static getRenoProperties(gameState) {
    const {
      houses,
      hotels,
      properties,
      numberOfHousesBeforeHotel,
      maxBuildingsAllowedOnProperty,
    } = gameState.config.propertyConfig;
    const player = gameState.currentPlayer;
    if (houses + hotels === 0) return [];
    const limitedHouses = houses === 0;
    const limitedHotels = hotels === 0;

    const availableRenoProps = _(properties)
      .filter((p) => p.ownedBy === player.id)
      .groupBy((p) => p.group) // { 'groupName': [properties] }
      .mapValues((properties) => ({
        properties,
        hasMonopoly: this.hasMonopoly(
          gameState,
          properties[0].group,
          properties[0].ownedBy
        ),
        minBuildingCount: Math.min(...properties.map((p) => p.buildings)),
      })) // { 'groupName': { propertiesInTheGroup: [], hasMonopoly: bool, minBuildingCount: number } }
      // CHECK: Property must be part of a monopoly
      .filter((pg) => pg.hasMonopoly)
      // CHECK: Minimum building count
      .mapValues((modifiedProperties) => ({
        properties: modifiedProperties.properties.filter(
          (p) => p.buildings === modifiedProperties.minBuildingCount
        ),
      }))
      .map((pg) => pg.properties) // [ [ { propertyGroup1 }], [ { propertyGroup2} ] ]
      .flattenDeep()
      .filter((p) => !p.mortgaged)
      // CHECK: Must have houses to build
      .filter(
        (p) => !limitedHouses || p.buildings === numberOfHousesBeforeHotel
      )
      // CHECK: Must have hotels to build
      .filter((p) => !limitedHotels || p.buildings < numberOfHousesBeforeHotel)
      // CHECK: Must have available cash on hand
      // could do a more sophisticated check with liquidity, but player can also
      //   manually go to liquidity screen for simplicity
      .filter((p) => p.houseCost < player.cash)
      .filter((p) => p.buildings < maxBuildingsAllowedOnProperty)
      .value();

    return availableRenoProps;
  }

  static getDemoProperties(gameState) {
    const { properties } = gameState.config.propertyConfig;
    const player = gameState.currentPlayer;

    const availableDemoProps = _(properties)
      .filter((p) => p.ownedBy === player.id)
      .filter((p) => p.buildings > 0)
      .groupBy((p) => p.group) // { 'groupName': [properties] }
      // CHECK: Maximum building count
      .mapValues((properties) => ({
        properties: properties.filter(
          (p) =>
            p.buildings ===
            Math.max.apply(
              Math,
              properties.map((p) => p.buildings)
            )
        ),
      })) // { 'groupName': { propertiesInTheGroup: [] } }
      .map((pg) => pg.properties) // [ [ { propertyGroup1 }], [ { propertyGroup2} ] ]
      .flattenDeep()
      .value();

    return availableDemoProps;
  }

  // TODO: AUCTION
};
