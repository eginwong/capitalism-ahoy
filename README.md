# Capitalism, Ahoy

[![Build Status](https://travis-ci.com/eginwong/capitalism-ahoy.svg?branch=master)](https://travis-ci.com/eginwong/capitalism-ahoy)
[![codecov](https://codecov.io/gh/eginwong/capitalism-ahoy/branch/master/graph/badge.svg)](https://codecov.io/gh/eginwong/capitalism-ahoy)

## Rules

- [Reference](https://www.hasbro.com/common/instruct/00009.pdf)
- [Missed Rules](http://richard_wilding.tripod.com/missedrules.htm#:~:text=If%20you%20are%20the%20new%20owner%2C%20you%20must%20pay%20%24220,%24220%20to%20unmortgage%20the%20property.)

## Inspiration

- [Jen Simmons](https://codepen.io/jensimmons/pen/qRGRjO)
- [John Coppola](https://codepen.io/johnnycopes/pen/yzQyMp)
- [Daniel Stern](https://github.com/danielstern/science/blob/master/monopoly.json)
- [Hoare Triples](https://en.wikipedia.org/wiki/Hoare_logic)
- [Cypress Custom Commands](https://docs.cypress.io/api/cypress-api/custom-commands.html#Arguments)

## TODO

### FEATURES

- TODO

### LIMITATIONS

- `Trade` can only allow up to a maximum of 35 options. Anything above 35 will cause the game to throw an exception.
  - mitigation: the maximum number of available assets for trade in a regular game is 32 (29 for properties, 1 for cash, 2 for cards).
  - cause: due to underlying limitation of `readline-sync` library

### ARCHITECTURE

[Architecture Documentation](./Architecture.md)

### REFLECTIONS

- dependency on UI
- issues with event-driven architecture with dependencies
  - UI
- generators are cool 🧐🧐🧐🧐🧐
- pre-condition testing for event-driven architecture
