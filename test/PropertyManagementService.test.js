const expect = require('chai').expect;
const PropertyManagementService = require('../entities/PropertyManagementService');
const { GameState } = require('../entities/GameState');
const { createPlayerFactory, createMonopoly } = require('./testutils');
const config = require('../config/monopolyConfiguration');
const { cloneDeep } = require('lodash');
const { findByGroup, findByPosition } = require('../entities/helpers');

describe('PropertyManagementService', () => {
  let gameState;

  beforeEach(() => {
    gameState = new GameState();
    let createPlayer = createPlayerFactory();
    gameState.players = [
      createPlayer({ name: 'player1' }),
      createPlayer({ name: 'player2' }),
    ];
    gameState.config = cloneDeep(config);
    gameState.turnValues = {
      roll: [1, 2],
      speedingCounter: 0,
    };
  });

  describe('findProperty', () => {
    it('should return property if id is found', () => {
      expect(
        PropertyManagementService.findProperty(gameState, 'jail')
      ).to.deep.equal(
        {
          name: 'Jail / Just Visiting',
          id: 'jail',
          position: 10,
          group: 'Special',
        },
        'Incorrect property retrieved from findProperty'
      );
    });
    it('should return undefined if id is not found in properties', () => {
      expect(PropertyManagementService.findProperty(gameState, 'nonsense')).to
        .be.undefined;
    });
  });
  describe('getCurrentPlayerBoardProperty', () => {
    it('should retrieve board property of current player', () => {
      gameState.currentPlayer.position = 3;
      const boardPosition = PropertyManagementService.getCurrentPlayerBoardProperty(
        gameState
      );
      expect(boardPosition).to.deep.equal(
        {
          name: 'Baltic Avenue',
          id: 'balticave',
          position: 3,
          price: 60,
          rent: 4,
          multipliedRent: [20, 60, 180, 320, 450],
          houseCost: 50,
          group: 'Purple',
          ownedBy: -1,
          buildings: 0,
          mortgaged: false,
        },
        `Incorrect board property returned from current player's position`
      );
    });
  });
  describe('getProperties', () => {
    it('should retrieve gameState properties', () => {
      const properties = PropertyManagementService.getProperties(gameState);
      expect(properties).to.deep.equal(
        gameState.config.propertyConfig.properties,
        `Incorrect properties returned from gameState`
      );
    });
  });
  describe('getPropertiesInPropertyGroup', () => {
    it('should retrieve gameState properties in same property group', () => {
      const propertyGroup = 'Railroad';
      const propertiesInGroup = gameState.config.propertyConfig.properties.filter(
        (p) => p.group === propertyGroup
      );
      expect(
        PropertyManagementService.getPropertiesInPropertyGroup(
          gameState,
          propertyGroup
        )
      ).to.deep.equal(
        propertiesInGroup,
        `Incorrect properties returned from gameState for properties of one property group`
      );
    });
    it('should retrieve gameState properties in same property group, case-insensitive', () => {
      const propertyGroup = 'railroad';
      const propertiesInGroup = gameState.config.propertyConfig.properties.filter(
        (p) => p.group.toUpperCase() === propertyGroup.toUpperCase()
      );
      expect(
        PropertyManagementService.getPropertiesInPropertyGroup(
          gameState,
          propertyGroup
        )
      ).to.deep.equal(
        propertiesInGroup,
        `Incorrect properties returned from gameState for properties of one property group`
      );
    });
  });
  describe('calculateRent', () => {
    describe('common properties', () => {
      it(`should charge rent based on buildings if built on the property`, () => {
        const ownerId = 1;
        const testProperty = findByPosition(
          gameState.config.propertyConfig.properties,
          3
        );
        testProperty.ownedBy = ownerId;
        testProperty.buildings = 3;
        gameState.currentBoardProperty = testProperty;

        expect(
          PropertyManagementService.calculateRent(gameState, testProperty)
        ).to.equal(
          testProperty.multipliedRent[testProperty.buildings - 1],
          'Rent incorrectly calculated for common properties with buildings'
        );
      });
      it(`should charge monopoly if all properties owned in group and no buildings are built`, () => {
        const ownerId = 1;
        const testProperty = findByPosition(
          gameState.config.propertyConfig.properties,
          3
        );
        testProperty.ownedBy = ownerId;
        gameState.currentBoardProperty = testProperty;
        createMonopoly(gameState, testProperty.group, ownerId);

        expect(
          PropertyManagementService.calculateRent(gameState, testProperty)
        ).to.equal(
          testProperty.rent * 2,
          'Rent incorrectly calculated for common properties with monopoly'
        );
      });
      it(`should not charge monopoly if not all properties owned in group`, () => {
        const ownerId = 1;
        const testProperty = findByPosition(
          gameState.config.propertyConfig.properties,
          3
        );
        testProperty.ownedBy = ownerId;
        gameState.currentBoardProperty = testProperty;

        expect(
          PropertyManagementService.calculateRent(gameState, testProperty)
        ).to.equal(
          testProperty.rent,
          'Rent incorrectly calculated for common properties with monopoly'
        );
      });
    });
    describe('railroads', () => {
      it(`should charge based on railroads owned`, () => {
        const ownerId = 1;
        const testProperty = findByGroup(
          gameState.config.propertyConfig.properties,
          'Railroad'
        );
        testProperty.ownedBy = ownerId;
        gameState.currentBoardProperty = testProperty;
        createMonopoly(gameState, testProperty.group, ownerId);

        expect(
          PropertyManagementService.calculateRent(gameState, testProperty)
        ).to.equal(
          config.propertyConfig.railRoadPricing[3],
          'Rent incorrectly calculated for railroad properties'
        );
      });
      it(`should charge multiplier for railroad rent if optional multiplier is passed`, () => {
        const ownerId = 1;
        const testProperty = findByGroup(
          gameState.config.propertyConfig.properties,
          'Railroad'
        );
        testProperty.ownedBy = ownerId;
        gameState.currentBoardProperty = testProperty;
        createMonopoly(gameState, testProperty.group, ownerId);
        const multiplier = 2;
        gameState.turnValues.rentMultiplier = multiplier;

        expect(
          PropertyManagementService.calculateRent(gameState, testProperty)
        ).to.equal(
          config.propertyConfig.railRoadPricing[3] * multiplier,
          'Rent incorrectly calculated for railroad properties with turn value multiplier'
        );
      });
    });
    describe('utilities', () => {
      it(`should charge based on roll`, () => {
        const ownerId = 1;
        const testProperty = findByGroup(
          gameState.config.propertyConfig.properties,
          'Utilities'
        );
        testProperty.ownedBy = ownerId;
        gameState.currentBoardProperty = testProperty;
        const totalRoll =
          gameState.turnValues.roll[0] + gameState.turnValues.roll[1];

        expect(
          PropertyManagementService.calculateRent(gameState, testProperty)
        ).to.equal(
          totalRoll * config.propertyConfig.singleUtilityMultiplier,
          'Rent incorrectly calculated for utilities'
        );
      });
      it(`should charge 10x multiplier for both utilities owned`, () => {
        const ownerId = 1;
        const testProperty = findByPosition(
          gameState.config.propertyConfig.properties,
          12
        );
        testProperty.ownedBy = ownerId;
        gameState.currentBoardProperty = testProperty;
        createMonopoly(gameState, testProperty.group, ownerId);
        const totalRoll =
          gameState.turnValues.roll[0] + gameState.turnValues.roll[1];

        expect(
          PropertyManagementService.calculateRent(gameState, testProperty)
        ).to.equal(
          totalRoll * config.propertyConfig.doubleUtilityMultiplier,
          'Rent incorrectly calculated for utilities'
        );
      });
      it(`should charge turn value multiplier if passed`, () => {
        const ownerId = 1;
        const testProperty = findByPosition(
          gameState.config.propertyConfig.properties,
          12
        );
        testProperty.ownedBy = ownerId;
        gameState.currentBoardProperty = testProperty;
        const totalRoll =
          gameState.turnValues.roll[0] + gameState.turnValues.roll[1];
        gameState.turnValues.rentMultiplier =
          config.propertyConfig.doubleUtilityMultiplier;

        expect(
          PropertyManagementService.calculateRent(gameState, testProperty)
        ).to.equal(
          totalRoll * config.propertyConfig.doubleUtilityMultiplier,
          'Rent incorrectly calculated for utilities with turn value multiplier'
        );
      });
    });
  });
  describe('changeOwner', () => {
    it('changes property ownership', () => {
      let testBoardProperty = {
        ownedBy: 1,
      };
      PropertyManagementService.changeOwner(
        testBoardProperty,
        gameState.players[0].id
      );
      expect(testBoardProperty.ownedBy).to.equal(
        0,
        `Incorrect player id: ${testBoardProperty.ownedBy} after changing property ownership`
      );
    });
  });
  describe('hasMonopoly', () => {
    it('returns true when player owns all properties in the specified board group', () => {
      const propertyGroup = 'Purple';
      createMonopoly(gameState, propertyGroup);
      expect(
        PropertyManagementService.hasMonopoly(
          gameState,
          propertyGroup,
          gameState.currentPlayer.id
        )
      ).to.equal(
        true,
        'Monopoly is not correctly calculated when player owns all properties of a property group'
      );
    });
    it('returns false when player does not own all properties in the specified board group', () => {
      const propertyGroup = 'Purple';
      findByGroup(
        gameState.config.propertyConfig.properties,
        propertyGroup
      ).ownedBy = gameState.currentPlayer.id;

      expect(
        PropertyManagementService.hasMonopoly(
          gameState,
          propertyGroup,
          gameState.currentPlayer.id
        )
      ).to.equal(
        false,
        'Monopoly is not correctly calculated when player owns some of the properties of a property group'
      );
    });
  });
  describe('mortgage', () => {
    let testBoardProperty;

    beforeEach(() => {
      testBoardProperty = {
        mortgaged: false,
        price: 60,
      };
    });

    it('toggles property mortgage flag', () => {
      PropertyManagementService.mortgage(gameState, testBoardProperty);
      expect(testBoardProperty.mortgaged).to.equal(
        true,
        'Board property mortgaged flag was not toggled to true'
      );
    });
    it('adds mortgage relief when mortgaging property', () => {
      const startingCash = gameState.currentPlayer.cash;
      PropertyManagementService.mortgage(gameState, testBoardProperty);
      expect(gameState.currentPlayer.cash).to.equal(
        startingCash +
          testBoardProperty.price /
            config.propertyConfig.mortgageValueMultiplier,
        "Board property mortgage cost was not correctly added to the current player's cash"
      );
    });
    it('decrease player assets on mortgage', () => {
      gameState.currentPlayer.assets = testBoardProperty.price;
      const startingAssets = gameState.currentPlayer.assets;

      PropertyManagementService.mortgage(gameState, testBoardProperty);
      expect(gameState.currentPlayer.assets).to.equal(
        startingAssets -
          testBoardProperty.price /
            config.propertyConfig.mortgageValueMultiplier,
        "Board property mortgage cost was not correctly subtracted from the player's assets"
      );
    });
  });
  describe('unmortgage', () => {
    let testBoardProperty;

    beforeEach(() => {
      testBoardProperty = {
        mortgaged: false,
        price: 60,
      };
    });

    it('toggles property unmortgage flag', () => {
      PropertyManagementService.unmortgage(gameState, testBoardProperty);
      expect(testBoardProperty.mortgaged).to.equal(
        true,
        'Board property mortgaged flag was not toggled to false'
      );
    });
    it('charges mortgage cost + interest rate when unmortgaging property', () => {
      testBoardProperty.mortgaged = true;
      const startingCash = gameState.currentPlayer.cash;
      const INTEREST_MULTIPLIER = 1 + config.propertyConfig.interestRate;
      PropertyManagementService.unmortgage(gameState, testBoardProperty);
      expect(gameState.currentPlayer.cash).to.equal(
        startingCash -
          (testBoardProperty.price /
            config.propertyConfig.mortgageValueMultiplier) *
            INTEREST_MULTIPLIER,
        "Board property mortgage cost was not correctly charged to the current player's cash"
      );
    });
    it('charges mortgage cost only when unmortgaging property if called with bypass', () => {
      testBoardProperty.mortgaged = true;
      const startingCash = gameState.currentPlayer.cash;
      const chargeInterest = false;
      PropertyManagementService.unmortgage(
        gameState,
        testBoardProperty,
        chargeInterest
      );
      expect(gameState.currentPlayer.cash).to.equal(
        startingCash -
          testBoardProperty.price /
            config.propertyConfig.mortgageValueMultiplier,
        "Board property mortgage cost was not correctly charged to the current player's cash"
      );
    });
    it('increase player assets on unmortgage', () => {
      testBoardProperty.mortgaged = true;
      const startingAssets = gameState.currentPlayer.assets;

      PropertyManagementService.unmortgage(gameState, testBoardProperty);
      expect(gameState.currentPlayer.assets).to.equal(
        startingAssets +
          testBoardProperty.price /
            config.propertyConfig.mortgageValueMultiplier,
        "Board property mortgage cost was not correctly added to the player's assets"
      );
    });
  });
  describe('toggleMortgageState', () => {
    let testBoardProperty;

    beforeEach(() => {
      testBoardProperty = {
        mortgaged: false,
        price: 60,
      };
    });

    it('toggles property mortgaged flag', () => {
      PropertyManagementService.toggleMortgageState(testBoardProperty);
      expect(testBoardProperty.mortgaged).to.equal(
        true,
        'Board property mortgaged flag was not toggled to true'
      );

      PropertyManagementService.toggleMortgageState(testBoardProperty);
      expect(testBoardProperty.mortgaged).to.equal(
        false,
        'Board property mortgaged flag was not toggled to false'
      );
    });
  });
  describe('renovate', () => {
    let testBoardProperty;

    beforeEach(() => {
      testBoardProperty = {
        id: 'balticave',
        multipliedRent: [20, 60, 180, 320, 450],
        houseCost: 50,
        buildings: 0,
      };
    });
    it('increments number of buildings on input property', () => {
      const startingBuildings = testBoardProperty.buildings;
      PropertyManagementService.renovate(gameState, testBoardProperty);
      expect(testBoardProperty.buildings).to.equal(
        startingBuildings + 1,
        `Number of buildings should have been incremented by one, instead, by ${
          testBoardProperty.buildings - startingBuildings
        }`
      );
    });
    it('decrements number of houses on global property limits', () => {
      const propertyConfig = gameState.config.propertyConfig;
      const startingGlobalHouses = propertyConfig.houses;

      PropertyManagementService.renovate(gameState, testBoardProperty);
      expect(propertyConfig.houses).to.equal(
        startingGlobalHouses - 1,
        `Number of global houses should have been decremented by one, instead, by ${
          propertyConfig.houses - startingGlobalHouses
        }`
      );
    });
    it('decrements number of hotels on global property limits', () => {
      const propertyConfig = gameState.config.propertyConfig;
      const startingGlobalHotels = propertyConfig.hotels;
      testBoardProperty.buildings = 4;

      PropertyManagementService.renovate(gameState, testBoardProperty);
      expect(propertyConfig.hotels).to.equal(
        startingGlobalHotels - 1,
        `Number of global hotels should have been decremented by one, instead, by ${
          propertyConfig.hotels - startingGlobalHotels
        }`
      );
    });
    it('charges building cost when constructing a building', () => {
      const startingCash = gameState.currentPlayer.cash;
      PropertyManagementService.renovate(gameState, testBoardProperty);
      expect(gameState.currentPlayer.cash).to.equal(
        startingCash - testBoardProperty.houseCost,
        `Cash should have been decremented by ${testBoardProperty.houseCost}`
      );
    });
    it('increases player assets when constructing a building', () => {
      const startingAssets = gameState.currentPlayer.assets;
      PropertyManagementService.renovate(gameState, testBoardProperty);
      expect(gameState.currentPlayer.assets).to.equal(
        startingAssets + testBoardProperty.houseCost,
        `Assets should have been incremented by ${testBoardProperty.houseCost}`
      );
    });
  });
  describe('demolish', () => {
    let testBoardProperty;

    beforeEach(() => {
      testBoardProperty = {
        id: 'balticave',
        multipliedRent: [20, 60, 180, 320, 450],
        houseCost: 50,
        buildings: 5,
      };
    });
    it('decrements number of buildings on input property', () => {
      const startingBuildings = testBoardProperty.buildings;
      PropertyManagementService.demolish(gameState, testBoardProperty);
      expect(testBoardProperty.buildings).to.equal(
        startingBuildings - 1,
        `Number of buildings should have been decremented by one, instead, by ${
          startingBuildings - testBoardProperty.buildings
        }`
      );
    });
    it('increments number of houses on global property limits', () => {
      const propertyConfig = gameState.config.propertyConfig;
      const startingGlobalHouses = propertyConfig.houses;
      testBoardProperty.buildings = 4;

      PropertyManagementService.demolish(gameState, testBoardProperty);
      expect(propertyConfig.houses).to.equal(
        startingGlobalHouses + 1,
        `Number of global houses should be incremented by one, instead, by ${
          propertyConfig.houses - startingGlobalHouses
        }`
      );
    });
    it('increments number of hotels on global property limits', () => {
      const propertyConfig = gameState.config.propertyConfig;
      const startingGlobalHotels = propertyConfig.hotels;

      PropertyManagementService.demolish(gameState, testBoardProperty);
      expect(propertyConfig.hotels).to.equal(
        startingGlobalHotels + 1,
        `Number of global hotels should be incremented by one, instead, by ${
          propertyConfig.hotels - startingGlobalHotels
        }`
      );
    });
    it('pays 1/2 the building cost when demolishing a building', () => {
      const startingCash = gameState.currentPlayer.cash;
      PropertyManagementService.demolish(gameState, testBoardProperty);
      expect(gameState.currentPlayer.cash).to.equal(
        startingCash +
          testBoardProperty.houseCost /
            config.propertyConfig.mortgageValueMultiplier,
        `Cash should have been incremented by ${
          testBoardProperty.houseCost /
          config.propertyConfig.mortgageValueMultiplier
        }`
      );
    });
    it('decreases player assets when demolishing a building', () => {
      const startingAssets = gameState.currentPlayer.assets;
      PropertyManagementService.demolish(gameState, testBoardProperty);
      expect(gameState.currentPlayer.assets).to.equal(
        startingAssets -
          testBoardProperty.houseCost /
            config.propertyConfig.mortgageValueMultiplier,
        `Assets should have been decremented by ${
          testBoardProperty.houseCost /
          config.propertyConfig.mortgageValueMultiplier
        }`
      );
    });
  });
  describe('getAvailableManagementActions', () => {
    it('should return mortgage if unmortgaged properties are available', () => {
      const MORTGAGE_ACTION = 'MORTGAGE';
      const propertyGroup = 'Purple';
      createMonopoly(gameState, propertyGroup);

      expect(
        PropertyManagementService.getAvailableManagementActions(
          gameState
        ).includes(MORTGAGE_ACTION)
      ).to.equal(
        true,
        `Missing ${MORTGAGE_ACTION} in available property management actions`
      );
    });
    it('should return unmortgage if mortgaged properties are available', () => {
      const UNMORTGAGE_ACTION = 'UNMORTGAGE';
      const propertyGroup = 'Purple';
      createMonopoly(gameState, propertyGroup);
      const expectedProperties = gameState.config.propertyConfig.properties.filter(
        (p) => p.group === propertyGroup
      );
      expectedProperties[0].mortgaged = true;

      expect(
        PropertyManagementService.getAvailableManagementActions(
          gameState
        ).includes(UNMORTGAGE_ACTION)
      ).to.equal(
        true,
        `Missing ${UNMORTGAGE_ACTION} in available property management actions`
      );
    });
    it('should return demolish if buildings are owned', () => {
      const RENOVATE_ACTION = 'RENOVATE';
      const propertyGroup = 'Purple';
      createMonopoly(gameState, propertyGroup);

      expect(
        PropertyManagementService.getAvailableManagementActions(
          gameState
        ).includes(RENOVATE_ACTION)
      ).to.equal(
        true,
        `Missing ${RENOVATE_ACTION} in available property management actions`
      );
    });
    it('should return renovate if there are renovatable properties', () => {
      const DEMOLISH_ACTION = 'DEMOLISH';
      const propertyGroup = 'Purple';
      createMonopoly(gameState, propertyGroup);
      const purpleProperties = gameState.config.propertyConfig.properties.filter(
        (p) => p.group === propertyGroup
      );
      purpleProperties[0].buildings = 1;

      expect(
        PropertyManagementService.getAvailableManagementActions(
          gameState
        ).includes(DEMOLISH_ACTION)
      ).to.equal(
        true,
        `Missing ${DEMOLISH_ACTION} in available property management actions`
      );
    });
  });
  describe('getMortgageableProperties', () => {
    it('should return properties that are owned with no buildings', () => {
      const propertyGroup = 'Purple';
      createMonopoly(gameState, propertyGroup);
      const expectedProperties = gameState.config.propertyConfig.properties.filter(
        (p) => p.group === propertyGroup
      );

      expect(
        PropertyManagementService.getMortgageableProperties(gameState)
      ).to.deep.equal(
        expectedProperties,
        'Properties that are not mortgageable are not returned'
      );
    });
    it('should not return properties if none are owned', () => {
      expect(
        PropertyManagementService.getMortgageableProperties(gameState)
      ).to.deep.equal([], 'Properties are returned when none are owned');
    });
    it('should not return properties that have buildings', () => {
      const propertyGroup = 'Purple';
      createMonopoly(gameState, propertyGroup);
      const expectedProperties = gameState.config.propertyConfig.properties.filter(
        (p) => p.group === propertyGroup
      );
      expectedProperties[0].buildings = 1;
      expectedProperties[1].buildings = 2;

      expect(
        PropertyManagementService.getMortgageableProperties(gameState)
      ).to.deep.equal([], 'Properties are returned when none are mortgageable');
    });
    it('should return properties railroads or utilities if owned', () => {
      const propertyGroup = 'Railroad';
      const propertyGroup2 = 'Utilities';
      createMonopoly(gameState, propertyGroup);
      createMonopoly(gameState, propertyGroup2);
      const expectedRailroadProperties = gameState.config.propertyConfig.properties.filter(
        (p) => p.group === propertyGroup
      );
      const expectedUtilityProperties = gameState.config.propertyConfig.properties.filter(
        (p) => p.group === propertyGroup2
      );

      expect(
        PropertyManagementService.getMortgageableProperties(gameState)
      ).to.deep.equal(
        expectedUtilityProperties.concat(expectedRailroadProperties),
        'Railroad and Utility Properties are not returned'
      );
    });
  });
  describe('getRenoProperties', () => {
    it('returns empty array if no houses or hotels remaining', () => {
      gameState.config.propertyConfig.houses = 0;
      gameState.config.propertyConfig.hotels = 0;

      expect(
        PropertyManagementService.getRenoProperties(gameState)
      ).to.deep.equal(
        [],
        'Unexpected renovatable properties when no house or hotels are available'
      );
    });
    it('should not return properties that are not in a monopoly', () => {
      const propertyGroup = 'Purple';
      findByGroup(
        gameState.config.propertyConfig.properties,
        propertyGroup
      ).ownedBy = gameState.currentPlayer.id;

      expect(
        PropertyManagementService.getRenoProperties(gameState)
      ).to.deep.equal([], 'Properties that are not in a monopoly are returned');
    });
    it('should return properties that are owned in a monopoly', () => {
      const propertyGroup = 'Purple';
      createMonopoly(gameState, propertyGroup);
      const expectedProperties = gameState.config.propertyConfig.properties.filter(
        (p) => p.group === propertyGroup
      );

      expect(
        PropertyManagementService.getRenoProperties(gameState)
      ).to.deep.equal(
        expectedProperties,
        'Properties that have a monopoly are not returned'
      );
    });
    it('should return properties that are owned in multiple monopolies', () => {
      const propertyGroup1 = 'Purple';
      const propertyGroup2 = 'Light Green';
      createMonopoly(gameState, propertyGroup1, gameState.currentPlayer.id);
      createMonopoly(gameState, propertyGroup2, gameState.currentPlayer.id);
      const expectedProperties = gameState.config.propertyConfig.properties.filter(
        (p) => p.group === propertyGroup1 || p.group === propertyGroup2
      );

      expect(
        PropertyManagementService.getRenoProperties(gameState)
      ).to.deep.equal(
        expectedProperties,
        'Properties that have a monopoly are not returned'
      );
    });
    it('should return properties that are not mortgaged', () => {
      const propertyGroup = 'Purple';
      createMonopoly(gameState, propertyGroup);
      const expectedProperties = gameState.config.propertyConfig.properties.filter(
        (p) => p.group === propertyGroup
      );
      expectedProperties[0].mortgaged = true;

      expect(
        PropertyManagementService.getRenoProperties(gameState)
      ).to.deep.equal(
        [expectedProperties[1]],
        'Properties that have a mortgage are returned'
      );
    });
    it('should return all properties when all properties have the same number of buildings in the same property group', () => {
      const propertyGroup = 'Light Green';
      createMonopoly(gameState, propertyGroup);
      const expectedProperties = gameState.config.propertyConfig.properties.filter(
        (p) => p.group === propertyGroup
      );
      expectedProperties.forEach((p) => {
        p.buildings = 1;
      });

      expect(
        PropertyManagementService.getRenoProperties(gameState)
      ).to.deep.equal(
        expectedProperties,
        'Properties that have a monopoly with same number of buildings are not all returned'
      );
    });
    it('should return 2 properties when 1/3 properties has more buildings than others in the same property group', () => {
      const propertyGroup = 'Light Green';
      createMonopoly(gameState, propertyGroup);
      const lightGreenProperties = gameState.config.propertyConfig.properties.filter(
        (p) => p.group === propertyGroup
      );
      lightGreenProperties[0].buildings = 2;
      lightGreenProperties[1].buildings = 1;
      lightGreenProperties[2].buildings = 1;

      expect(
        PropertyManagementService.getRenoProperties(gameState)
      ).to.deep.equal(
        [lightGreenProperties[1], lightGreenProperties[2]],
        'Properties that have a monopoly with different number of buildings are not returned correctly'
      );
    });
    it('should return 1 property when 2/3 properties have more buildings than others in the same property group', () => {
      const propertyGroup = 'Light Green';
      createMonopoly(gameState, propertyGroup);
      const lightGreenProperties = gameState.config.propertyConfig.properties.filter(
        (p) => p.group === propertyGroup
      );
      lightGreenProperties[0].buildings = 2;
      lightGreenProperties[1].buildings = 2;
      lightGreenProperties[2].buildings = 1;

      expect(
        PropertyManagementService.getRenoProperties(gameState)
      ).to.deep.equal(
        [lightGreenProperties[2]],
        'Properties that have a monopoly with different number of buildings are not returned correctly'
      );
    });
    it('should not return properties that the player cannot afford to buy with mortgaged property', () => {
      gameState.currentPlayer.cash = 70;
      const propertyGroup1 = 'Purple';
      const propertyGroup2 = 'Violet';
      createMonopoly(gameState, propertyGroup1, gameState.currentPlayer.id);
      createMonopoly(gameState, propertyGroup2, gameState.currentPlayer.id);
      const expectedProperties = gameState.config.propertyConfig.properties.filter(
        (p) => p.group === propertyGroup1
      );

      expect(
        PropertyManagementService.getRenoProperties(gameState)
      ).to.deep.equal(
        expectedProperties,
        'Properties returned that player is unable to renovate'
      );
    });
    it('should not return properties that have 5 buildings', () => {
      const propertyGroup = 'Purple';
      createMonopoly(gameState, propertyGroup);
      const expectedProperties = gameState.config.propertyConfig.properties.filter(
        (p) => p.group === propertyGroup
      );
      expectedProperties[0].buildings = 5;
      expectedProperties[1].buildings = 4;

      expect(
        PropertyManagementService.getRenoProperties(gameState)
      ).to.deep.equal(
        [expectedProperties[1]],
        'Properties returned that already have hotels'
      );
    });
    it('should not return eligible properties for house renovation if no houses are remaining', () => {
      gameState.config.propertyConfig.houses = 0;
      const propertyGroup = 'Purple';
      createMonopoly(gameState, propertyGroup);

      expect(
        PropertyManagementService.getRenoProperties(gameState)
      ).to.deep.equal(
        [],
        'Properties that need houses are returned even though no more houses to build'
      );
    });
    it('should not return eligible properties for hotel renovation if no hotels are remaining', () => {
      gameState.config.propertyConfig.hotels = 0;
      const propertyGroup = 'Purple';
      createMonopoly(gameState, propertyGroup);
      gameState.config.propertyConfig.properties
        .filter((p) => p.group === propertyGroup)
        .forEach((p) => {
          p.buildings = 4;
        });

      expect(
        PropertyManagementService.getRenoProperties(gameState)
      ).to.deep.equal(
        [],
        'Properties that need hotels are returned even though no more hotels to build'
      );
    });
  });
  describe('getDemoProperties', () => {
    it('returns empty array if no buildings are owned', () => {
      expect(
        PropertyManagementService.getDemoProperties(gameState)
      ).to.deep.equal(
        [],
        'Unexpected demo properties when no house or hotels are available'
      );
    });
    it('should return all properties when all properties have the same number of buildings in the same property group', () => {
      const propertyGroup = 'Light Green';
      createMonopoly(gameState, propertyGroup);
      const expectedProperties = gameState.config.propertyConfig.properties.filter(
        (p) => p.group === propertyGroup
      );
      expectedProperties.forEach((p) => {
        p.buildings = 1;
      });

      expect(
        PropertyManagementService.getDemoProperties(gameState)
      ).to.deep.equal(
        expectedProperties,
        'Properties that are in the same group with same number of buildings are not all returned'
      );
    });
    it('should return 1 property when 2/3 properties have more buildings than others in the same property group', () => {
      const propertyGroup = 'Light Green';
      createMonopoly(gameState, propertyGroup);
      const lightGreenProperties = gameState.config.propertyConfig.properties.filter(
        (p) => p.group === propertyGroup
      );
      lightGreenProperties[0].buildings = 2;
      lightGreenProperties[1].buildings = 1;
      lightGreenProperties[2].buildings = 1;

      expect(
        PropertyManagementService.getDemoProperties(gameState)
      ).to.deep.equal(
        [lightGreenProperties[0]],
        'Properties that are in the same group with different number of buildings are not returned correctly'
      );
    });
    it('should return 2 properties when 1/3 properties have more buildings than others in the same property group', () => {
      const propertyGroup = 'Light Green';
      createMonopoly(gameState, propertyGroup);
      const lightGreenProperties = gameState.config.propertyConfig.properties.filter(
        (p) => p.group === propertyGroup
      );
      lightGreenProperties[0].buildings = 2;
      lightGreenProperties[1].buildings = 2;
      lightGreenProperties[2].buildings = 1;

      expect(
        PropertyManagementService.getDemoProperties(gameState)
      ).to.deep.equal(
        [lightGreenProperties[0], lightGreenProperties[1]],
        'Properties that are in the same group with different number of buildings are not returned correctly'
      );
    });
    it('should not return properties that have 0 buildings', () => {
      const propertyGroup = 'Purple';
      createMonopoly(gameState, propertyGroup);

      expect(
        PropertyManagementService.getDemoProperties(gameState)
      ).to.deep.equal([], 'Properties returned that have 0 buildings');
    });
  });
  describe('getPlayerPropertiesForTrade', () => {
    it('should return the properties of the current player if optional player param is not passed', () => {
      const propertyGroup = 'Purple';
      createMonopoly(gameState, propertyGroup);
      const expectedTradeablePropertiesOfGroup = gameState.config.propertyConfig.properties.filter(
        (p) => p.group === propertyGroup
      );
      const propertyGroup2 = 'Violet';
      createMonopoly(gameState, propertyGroup2);
      const expectedUntradeablePropertiesOfGroup = gameState.config.propertyConfig.properties.filter(
        (p) => p.group === propertyGroup2
      );
      expectedUntradeablePropertiesOfGroup[0].buildings = 1;

      expect(
        PropertyManagementService.getPlayerPropertiesForTrade(gameState)
      ).to.deep.equal(
        {
          untradeableProps: expectedUntradeablePropertiesOfGroup,
          tradeableProps: expectedTradeablePropertiesOfGroup,
        },
        'Properties are not returned for default current player'
      );
    });
    it('should return railroads and utilities under tradeable properties of the current player', () => {
      const propertyGroup = 'Utilities';
      const propertyGroup2 = 'Railroad';
      createMonopoly(gameState, propertyGroup);
      createMonopoly(gameState, propertyGroup2);
      const expectedTradeablePropertiesOfGroup = gameState.config.propertyConfig.properties.filter(
        (p) => p.group === propertyGroup || p.group === propertyGroup2
      );

      expect(
        PropertyManagementService.getPlayerPropertiesForTrade(gameState)
      ).to.deep.equal(
        {
          untradeableProps: [],
          tradeableProps: expectedTradeablePropertiesOfGroup,
        },
        'Properties are not returned for default current player for railroad and utilities'
      );
    });
    it('should return the tradeable properties of the param player', () => {
      const targetPlayer = gameState.players[1];
      const propertyGroup1 = 'Purple';
      const propertyGroup2 = 'Light Green';
      createMonopoly(gameState, propertyGroup1, targetPlayer.id);
      createMonopoly(gameState, propertyGroup2, targetPlayer.id);
      const expectedPropertiesOfGroup1 = gameState.config.propertyConfig.properties.filter(
        (p) => p.group === propertyGroup1
      );
      const expectedPropertiesOfGroup2 = gameState.config.propertyConfig.properties.filter(
        (p) => p.group === propertyGroup2
      );

      expect(
        PropertyManagementService.getPlayerPropertiesForTrade(
          gameState,
          targetPlayer
        ).tradeableProps
      ).to.deep.equal(
        [...expectedPropertiesOfGroup1, ...expectedPropertiesOfGroup2],
        'Properties that are not tradeable are returned for input player'
      );
    });
    it('should return the properties of the param player', () => {
      const targetPlayer = gameState.players[1];
      const propertyGroup1 = 'Purple';
      const propertyGroup2 = 'Light Green';
      createMonopoly(gameState, propertyGroup1, targetPlayer.id);
      createMonopoly(gameState, propertyGroup2, targetPlayer.id);
      const expectedPropertiesOfGroup1 = gameState.config.propertyConfig.properties.filter(
        (p) => p.group === propertyGroup1
      );
      const expectedPropertiesOfGroup2 = gameState.config.propertyConfig.properties.filter(
        (p) => p.group === propertyGroup2
      );
      expectedPropertiesOfGroup2[0].buildings = 1;

      expect(
        PropertyManagementService.getPlayerPropertiesForTrade(
          gameState,
          targetPlayer
        )
      ).to.deep.equal(
        {
          tradeableProps: expectedPropertiesOfGroup1,
          untradeableProps: expectedPropertiesOfGroup2,
        },
        'Properties that are not returned for input player'
      );
    });
    it('should not return properties if none are owned', () => {
      const playerProps = PropertyManagementService.getPlayerPropertiesForTrade(
        gameState
      );
      expect(playerProps.tradeableProps).to.deep.equal(
        [],
        'Properties are returned when no tradeable properties are owned'
      );
      expect(playerProps.untradeableProps).to.deep.equal(
        [],
        'Properties are returned when no untradeable properties are owned'
      );
    });
  });
  describe('getConstructedHouses', () => {
    it('returns empty array if no buildings are owned', () => {
      expect(
        PropertyManagementService.getConstructedHouses(gameState)
      ).to.equal(0, 'Unexpected houses when no buildings are owned');
    });
    it('should return all houses owned across all properties, not including hotels', () => {
      const propertyGroup1 = 'Light Green';
      createMonopoly(gameState, propertyGroup1);
      const propertyGroup2 = 'Purple';
      createMonopoly(gameState, propertyGroup2);
      const propertyGroup3 = 'Dark Green';
      createMonopoly(gameState, propertyGroup3);
      gameState.config.propertyConfig.properties
        .filter((p) => p.group === propertyGroup1)
        .forEach((p) => {
          p.buildings = 5; // total: 3 * 4 = 12
        });
      gameState.config.propertyConfig.properties
        .filter((p) => p.group === propertyGroup2)
        .forEach((p) => {
          p.buildings = 3; // total: 3 * 2 = 6
        });

      const result = PropertyManagementService.getConstructedHouses(gameState);

      expect(result).to.equal(
        18,
        `Constructed houses incorrectly returned: ${result}`
      );
    });
  });
  describe('getConstructedHotels', () => {
    it('returns empty array if no hotels are owned', () => {
      expect(
        PropertyManagementService.getConstructedHotels(gameState)
      ).to.equal(0, 'Unexpected hotels when no buildings are owned');
    });
    it('should return all houses owned across all properties, not including hotels', () => {
      const propertyGroup1 = 'Light Green';
      createMonopoly(gameState, propertyGroup1);
      const propertyGroup2 = 'Purple';
      createMonopoly(gameState, propertyGroup2);
      const propertyGroup3 = 'Dark Green';
      createMonopoly(gameState, propertyGroup3);
      gameState.config.propertyConfig.properties
        .filter((p) => p.group === propertyGroup1)
        .forEach((p) => {
          p.buildings = 5; // total: 3 * 1
        });
      gameState.config.propertyConfig.properties
        .filter((p) => p.group === propertyGroup2)
        .forEach((p) => {
          p.buildings = 3; // total: 3 * 0
        });

      const result = PropertyManagementService.getConstructedHotels(gameState);

      expect(result).to.equal(
        3,
        `Constructed hotels incorrectly returned: ${result}`
      );
    });
  });
});
