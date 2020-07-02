## Capitalism, Ahoy

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

### CODE
- ~~TODO: testing framework~~
- ~~TODO: TDD/BDD (given when then), integration testing framework~~
- ~~TODO: chalk for console UI + testing~~
- TODO: linter
- TODO: prettier
- TODO: look into removing gameState from PlayerActions#execute by passing it in
- TODO: continue gamestate (check PropService?)
- TODO: validate GameState
- TODO: use inquirer for prompts instead

### REFLECTIONS
- dependency on UI 
- issues with event-driven architecture with dependencies
  - UI
- generators are cool 🧐🧐🧐🧐🧐