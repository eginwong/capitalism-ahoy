
```js
// events (world)
{
    START_GAME: startGame,
    END_GAME,
    START_TURN: startTurn,
    CONTINUE_TURN: continueTurn,
    END_TURN: endTurn,
    TRADE,
    PROPERTY_DEVELOPMENT,
    AUCTION,
    DICE_ROLLED: diceRolled,
    MOVE_PLAYER: movePlayer,
    PASS_GO: passGo
}

// actions (defier)
{
    ROLL_DICE: {
        execute: rollDice,
        isAvailable: () => true
    },
    USE_GET_OUT_OF_JAIL_CARD,
    BUY_GET_OUT_OF_JAIL_CARD,
    SELL_GET_OUT_JAIL_CARD,
    PAY_FINE: {
        execute: payFine,
        isAvailable: () => true
        // not available if your networth < FINE
    },
    CONSTRUCT_HOUSE,
    DECONSTRUCT_HOUSE,
    CONSTRUCT_HOTEL,
    DECONSTRUCT_HOTEL,
    MORTGAGE_PROPERTY,
    INITIATE_TRADE
}

// reactions
{
    BUY_PROPERTY: () => {}
    PAY_RENT,
    ENFORCE_PAY_FINE: enforcePayFine,
    SPEEDING: speeding,
    BANKRUPTCY: bankruptcy,
    JAIL: jail
    // potentially Chance/Community Cards
}
```

- TODO: list of remaining events
  - ~~PASS_GO?~~
  - AUCTION (// subsequent actions? bid, raise?)


- TODO: remaining
  - PAY_RENT
  - ~~startTurn~~
  - ~~PropertyService~~
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

export const CONSTANTS = {
    "HOUSE_LIMIT": 32,
    "HOTEL_LIMIT": 12
};

- ~~TODO: Complete a turn~~
- ~~TODO: VALIDATION, do not allow user to end turn without rolling dice~~
- TODO: random array of movement emojis
  - read: emoji manifesto
- ~~TODO: testing framework~~
- TODO: integration testing framework
- TODO: chalk for console UI + testing
- TODO: look into removing gameState from PlayerActions#execute by passing it in