## Capitalism, Ahoy

[![Build Status](https://travis-ci.com/eginwong/capitalism-ahoy.svg?branch=master)](https://travis-ci.com/eginwong/capitalism-ahoy)
[![codecov](https://codecov.io/gh/eginwong/capitalism-ahoy/branch/master/graph/badge.svg)](https://codecov.io/gh/eginwong/capitalism-ahoy)

## Rules
- [Reference](https://www.hasbro.com/common/instruct/00009.pdf)

## Inspiration
- [Jen Simmons](https://codepen.io/jensimmons/pen/qRGRjO)
- [John Coppola](https://codepen.io/johnnycopes/pen/yzQyMp)
- [Daniel Stern](https://github.com/danielstern/science/blob/master/monopoly.json)
- [Hoare Triples](https://en.wikipedia.org/wiki/Hoare_logic)
- [Cypress Custom Commands](https://docs.cypress.io/api/cypress-api/custom-commands.html#Arguments)

## TODO
### FUNCTIONALITY
- ~~TODO: Complete a turn~~
- ~~TODO: VALIDATION, do not allow user to end turn without rolling dice~~
- TODO: add end game function to stop execution?
- TODO: UI implementation for frontend 
  - material-ui to make things look nice
  - display properties
  - move pieces
- TODO: random array of movement emojis
  - read: emoji manifesto
- TODO: enforce global house limits (32), hotel limits (12)
- TODO: game log
- TODO: remaining
  - ~~startTurn~~
  - ~~PropertyService~~
  - PAY_RENT
  - USE_GET_OUT_OF_JAIL_CARD
  - CONSTRUCT_HOUSE,
  - DECONSTRUCT_HOUSE,
  - CONSTRUCT_HOTEL,
  - DECONSTRUCT_HOTEL,
  - MORTGAGE_PROPERTY,
  - Players
  - BONUS:
    - liquidity
      - cannot trade with other players
    - bankruptcy
    - interactivity
      - trade
      - sell
      - auction
- TODO: Pass in options to set fine/go parameters/max houses
- TODO: House service to manage property purchasing/global maximums
- Q: does gamestate have dependency on house service (so that it knows how to set playeractions for buy house if available)? Or should that be on the property service?

### ARCHITECTURE
- Services
  - BuildingService (buy/sell houses, enforce housing limits, handle buy/sell logic)
    - requires propertyService OR gameState
  - PropertyService (lookup of position <-> property, calculates rent, handles auctions/purchases/sales of property)
  - CashManagementService (networth calculation, increment, decrement, liquidation, bankruptcy)
    - Q: need to know when to calculate networth
    - requires player
  - CardService (community chest, chance, randomly draws card from open deck, shuffles)
    - 
- PlayerActions
  - main actors
- Events
  - main actors
- GameState
  - glue
- Game
  - glue, configuration, start/continue
- main
- TODO: One-Pager Architecture Write-up :: Keegan


### CODE
- ~~TODO: testing framework~~
- ~~TODO: TDD/BDD (given when then), integration testing framework~~
- ~~TODO: chalk for console UI + testing~~
- ~~TODO: set up travis ci for test coverage check~~
- TODO: linter
- TODO: prettier
- TODO: [add check for if there are formatting changes outstanding on build](https://github.com/yyx990803/yorkie)
- ~~TODO: look into removing gameState from PlayerActions#execute by passing it in~~
- TODO: continue gamestate (check PropService?)
- TODO: validate GameState
- TODO: use inquirer for prompts instead
- TODO: Investigate using Mocha's reporter flag for NYC
- TODO: Refactor Mocha-bloat (not a Mocha-Float); leverage modules

### REFLECTIONS
- dependency on UI 
- issues with event-driven architecture with dependencies
  - UI
- generators are cool 🧐🧐🧐🧐🧐
- pre-condition testing for event-driven architecture
