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

  it('should make a call to the UI#prompt', () => {
    const uiSpy = sinon.spy();
    userInterface.prompt = uiSpy;
    highestRollingPlayerGoesFirst({ UI: userInterface }, input);
    expect(uiSpy.callCount).to.equal(
      input.players.length,
      `UI method for highestRollingPlayerGoesFirst was not called`
    );
  });
  it(`should reorder players based on random dice rolls if required starting clockwise from largest`, () => {
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
    const reorderedNames = input.players.map((p) => p.name);
    expect(reorderedNames).to.deep.equal(
      ['Player5', 'Player1', 'Player2', 'Player3', 'Player4'],
      'Unexpected player order, not following Clockwise from highest player roll'
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
