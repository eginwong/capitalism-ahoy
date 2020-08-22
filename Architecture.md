# Architecture

## High Level

| Entry Point | Game Loop | Outputs        |
|-------------|-----------|--------------: |
| main.js     | game.js   | SIG_TERM, Save |

### `main.js`

Serves as a boostrapping file for the environment the game will run in.

Provides to `game.js`:

- EventBus -- backbone of the physical game loop. Must be synchronous.
- GameState -- a clean one for a new game, else a dirty one for a loaded save file.
- userInterface -- an interface bridging the game to an arbitrary UI to describe it.

### `game.js`

Describes the game loop by organizing necessary dependencies and queuing the game actions in the passed `EventBus`.

We use the setup logic in `game.js` to bind out `UI` and `gameState` to all of our `Rules` (see section below).

### Outputs

The game loop ends produces two outputs, one of which is arguable a byproduct.

- `SIG_TERM` -- the game ends via a termination signal, outputting the associated code value.
- `Save` -- the game outputs a save file (dirty `gameState`); this does _not_ terminate the game.

## Game Loop Breakdown

```javascript
// Demonstrative code only to express high-level concepts
const Rules = {
    [ruleName: string]: [
        ...actions: function ({ UI, notify }, gameState): void Event?
    ]
}

while(eventBus.events && !SIG_TERM) {
    let nextEvent = eventBus.next();
    Rules[nextEvent.name].evaluate(nextEvent);
}
```

### Rules Dictionary

Game rules are written in the `Rules/index.js` file, which exists as a Dictionary with Keys of Rule Names and Values of an Array of Actions.

An Action is a function with the signature `function ({ UI, notify }, gameState): void Event?`, where:

- `UI` is the `userInterface` injected from `main.js`.
- `notify` is a function to produce the `void Event?` effect (i.e., broadcast an event to evaluate another rule).
- `gameState` is an object containing the game's state.

The game loop runs on the assumption that named `Events` have a one-to-one association to a `Rule`.

`Rule`s have a name but otherwise are an ordered list of `Action`s that occur to evaluate the `Rule`. Think of it like steps take to follow or enact a rule. For example, a rule for moving a player piece around a board might be:

```javascript
const Rules = {
    /* ... */
    "MOVE_PLAYER": [
        function promptCurrentPlayerToRollDice (_, gameState) { /* ... */ },
        function movePlayerTokenSpacesEqualToDiceROll ({ UI, notify }, gameState) {
            /* ... */
            notify("PLAYER_MOVED");
        }
    ],
    /* ... */
}
```

It might be important to note that calls to `notify` usually only happen at the _end_ of a `Rule` (i.e., the last executed line of the last `Action` in the `Rule`'s array of `Action`s) and that the `EventBus` is synchronous, as mentioned earlier. This dictates the pace and order in which `Rule`s can be evaluated, so make sure you understand that well.

`notify` has a return type of `void` but it broadcasts an `Event`, so we've presented the type signature `void Event` to denote this. You may have seen above for the `Action` signature that it returned `void Event?` - the `?` here simply denotes that not all actions emit `Event`s, hence it is an optional return type.

> **Protip:** Looking for how something in the game works? Everything is in the `Rules/index.js` file. Open the file and skim through top-down and you are likely to either find a `Rule` name matching what you're looking for, else see another `Rule` that you are familiar with and can follow it's `notify` flow to learn the name of the `Rule`(s) you are trying to find.

## Components

Components are meant to capture-with-code real-world objects that are needed for a boardgame, such as a dice, spinners, paper money, and even a board (doy!).

Not all components are needed to be captured-with-code for all games (e.g., we can use a `Number` property on the `gameState` to track money or points instead of making `Token`s for them), but sometimes it is convenient.

Review the `Components` folder to see what has been abstracted.

## Services

Services are meant to encapsulate some behaviours usually across multiple components. An example might be the `PlayerActions` service that encapsulates all the behaviours that players can take so that they can be more easily shared instead of in instances of a class.

Other examples include:

- The `WealthService` which interfaces all the money-related operations of a game

## Misc

..