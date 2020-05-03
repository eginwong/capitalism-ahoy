## Capitalism, Ahoy


## TODO
- set up game loop
- have players able to take actions
- material-ui to make things look nice
- display properties
- move pieces
- TDD/BDD (given when then)


## Rules
- [Reference](https://www.hasbro.com/common/instruct/00009.pdf)

## Inspiration
- [Jen Simmons](https://codepen.io/jensimmons/pen/qRGRjO)
- [John Coppola](https://codepen.io/johnnycopes/pen/yzQyMp)
- [Daniel Stern](https://github.com/danielstern/science/blob/master/monopoly.json)
- [Hoare Triples](https://en.wikipedia.org/wiki/Hoare_logic)

## Appendix

### Scratch Notes
Developed property = houses, hotels


- Game Features
  - Community Chest / Chance cards
    - Random community chest / chance cards
    - Use get-out-of-jail-free cards
  - Special custom play pieces
  - Allow user to see property cards
  - Mortgages
    - On mortgage, the bank loans the player 50% of value of property denoted on card
    - On paying back the mortgage, must pay back 50% of the value of the property + 10%
    - If a mortgaged property is sold to another player, that player can optionally pay back the mortgage right away (50% + 10% for interest) or they can pay 10% interest to transfer and then pay another 50% + 10% interest when they pay back the loan
    - Cannot develop property in a set as long as one property is mortgaged
  - Double Unimproved Rent
    - When an entire set of property is owned, double the unimproved cost of rent
    - Mortgages have no impact on being able to double unimproved cost of rent for un-mortgaged properties
  - Trading
    - A player is able to trade another player. At least one of the parties must offer at least 1 property for trade.
    - A player is not allowed to trade cash for cash
  - Selling
    - Selling developed property is paid out at 50% of the cost of the development (e.g., a house cost $300 to build. Resale value is $150).
    - A property cannot be sold/traded to another player if there is developed property on it.
  - Auction ability
    - If a user lands on an unbought property, they can choose not to purchase it. If they do not, an auction occurs between all players starting at any price starting at the lowest price of any property ($60). 
  - Doubles
    - When a player rolls doubles, they can go again.
  - Allow Speeding when a player rolls doubles three consecutive times. This sends the player to jail.
  - Jail Logic
    - Can pay fine first and then roll freely
    - Roll up to three turns to try and roll a double and on the third turn, if not escaped, must pay fine and move the spaces
    - If fine is not paid, a double will let the player escape the jail but they cannot continue rolling
  - Developed property must be added evenly across the set (e.g., if a property set has 3 properties included, a player can only develop houses by putting 1 on each property. All properties must have the same or 1 fewer house/hotel than the maximum number of houses in the corresponding property set).
  - Finite hotels available

- Application Features
  - Activity Log
  - Rotate the board
  - Advanced Statistics (turns in jail, times caught speeding, net-worth over time)
  - Toggle animation speed
  - Animate pieces moving around the board
  - Roll Dice animation
  - AI Computers
  - Visual indicators for the owner of a property

- Entities:
- Player
  - Figurines / Player Token (car, iron, dog)
  - Position + Player ID
  - Jail* (shorthand as Boolean, else us Position as Rule)
  - Cash
  - List of Property ID

- (JimmyEat)World
  - Properties (Global Properties) (is also board -- plot twist !)
  - Hotels
  - Houses

- Functions / Thoughts:
  - takeTurn currentPlayer gamestate = doTurnActions

- turnActions
  - bag of actions
  - Dice roll -> automove player position

- Game Loop
  - Rules for what happens
  - game [] _ = promptToGetPlayers
  - game _ () = selectBoard
  - game listOfPlayers board = start

- !! Cannon Fodder
```js 
function gameLoop () {
    // gameState.turn
    const currentPlayer = getCurrentPlayer; 

    await takeTurn(currentPlayer, gameState);

}

function takeTurn(player, state) {

    let action; 
    do {

    } while (action != ACTION.END_TURN);
    return 
}
```

```js

class Console extends UI {}

class UI {}

```

- TODO: create game in cli/repl? 
  - ETHOS: decoupling UI from game logic 