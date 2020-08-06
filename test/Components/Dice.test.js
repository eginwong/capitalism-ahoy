const expect = require('chai').expect;
const Dice = require('../../entities/Components/Dice');

describe('Dice', () => {
  it(`should roll 1 D6 by default`, () => {
    const output = Dice.roll();
    expect(Array.isArray(output)).to.equal(
      true,
      'roll did not output an Array'
    );
    expect(output.length).to.equal(
      1,
      'roll output Array has more than one value by default'
    );
    expect(output[0] > 0).to.equal(true, 'roll output is less than 1');
    expect(output[0] < 7).to.equal(true, 'roll output is greater than 6');
    expect(output.every((n) => typeof n === 'number')).to.equal(
      true,
      'roll output Array is not only Numbers'
    );
  });
  it(`should roll _n_ times given _n_ as an integer parameter with D6 by default`, () => {
    const quantity = 5;
    const output = Dice.roll({ quantity });
    expect(Array.isArray(output)).to.equal(
      true,
      'roll did not output an Array'
    );
    expect(output.length).to.equal(
      quantity,
      `roll output Array has more than expected ${quantity}`
    );
    expect(output.every((val) => val > 0)).to.equal(
      true,
      'roll output is less than 1'
    );
    expect(output.every((val) => val < 7)).to.equal(
      true,
      'roll output is greater than 6'
    );
    expect(output.every((n) => typeof n === 'number')).to.equal(
      true,
      'roll output Array is not only Numbers'
    );
  });
  it(`should roll 1 die of _y_ faces given _y_ as an integer parameter`, () => {
    const faces = 4;
    const output = Dice.roll({ faces });
    expect(Array.isArray(output)).to.equal(
      true,
      'roll did not output an Array'
    );
    expect(output.length).to.equal(
      1,
      'roll output Array has more than one value by default'
    );
    expect(output.every((val) => val > 0)).to.equal(
      true,
      'roll output is less than 1'
    );
    expect(output.every((val) => val <= faces)).to.equal(
      true,
      `roll output is greater than ${faces}`
    );
    expect(output.every((n) => typeof n === 'number')).to.equal(
      true,
      'roll output Array is not only Numbers'
    );
  });
  it(`should return result of numeric array`, () => {
    const output = Dice.roll();
    expect(Array.isArray(output)).to.equal(
      true,
      'roll did not output an Array'
    );
    expect(output.every((n) => typeof n === 'number')).to.equal(
      true,
      'roll output Array is not only Numbers'
    );
  });
});
