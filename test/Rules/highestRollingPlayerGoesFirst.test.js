const expect = require('chai').expect;
const sinon = require('sinon');
const highestRollingPlayerGoesFirst = require('../../entities/Rules/highestRollingPlayerGoesFirst');
const Dice = require('../../entities/Components/Dice');
const { createPlayer } = require('../testutils');
const mockUIFactory = require('../mocks/UI');

describe('Rules -> highestRollingPlayerGoesFirst', () => {
  let userInterface;
  let input;
  let diceStub;

  beforeEach(() => {
    userInterface = mockUIFactory();
    input = {
      players: [
        createPlayer({ name: 'Player1' }),
        createPlayer({ name: 'Player2' }),
      ],
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  it(`should assign indices to each player`, () => {
    highestRollingPlayerGoesFirst({ UI: userInterface }, input);
    for (let index = 0; index < input.players.length; index++) {
      expect(
        input.players[index].id === index,
        `Player index of ${index} does not match player position`
      );
    }
  });

  it('should make a call to the UI#prompt', () => {
    const uiSpy = sinon.spy();
    userInterface.prompt = uiSpy;
    highestRollingPlayerGoesFirst({ UI: userInterface }, input);
    expect(uiSpy.callCount).to.equal(
      input.players.length,
      `UI method for highestRollingPlayerGoesFirst was not called`
    );
  });
  xit(`should reorder players based on random dice rolls if required`, () => {
    diceStub = sinon.stub(Dice, 'roll');
    input.players.push(createPlayer({ name: 'Player3' }));
    input.players.push(createPlayer({ name: 'Player4' }));
    input.players.push(createPlayer({ name: 'Player5' }));

    diceStub.onCall(0).returns([1]);
    diceStub.onCall(1).returns([2]);
    diceStub.onCall(2).returns([3]);
    diceStub.onCall(3).returns([4]);
    diceStub.onCall(4).returns([6]);

    highestRollingPlayerGoesFirst({ UI: userInterface }, input);
    expect(input.players[4].name).to.equal(
      'Player1',
      'Unexpected player in order 4'
    );
    expect(input.players[3].name).to.equal(
      'Player2',
      'Unexpected player in order 3'
    );
    expect(input.players[2].name).to.equal(
      'Player3',
      'Unexpected player in order 2'
    );
    expect(input.players[1].name).to.equal(
      'Player4',
      'Unexpected player in order 1'
    );
    expect(input.players[0].name).to.equal(
      'Player5',
      'Unexpected player in order 0'
    );
  });
  it(`should not reorder players based on random dice rolls if not required`, () => {
    diceStub = sinon.stub(Dice, 'roll');
    diceStub.onCall(0).returns([6]);
    diceStub.onCall(1).returns([1]);

    highestRollingPlayerGoesFirst({ UI: userInterface }, input);
    expect(input.players[0].name).to.equal(
      'Player1',
      'Unexpected player in order 0'
    );
    expect(input.players[1].name).to.equal(
      'Player2',
      'Unexpected player in order 1'
    );
  });
});
