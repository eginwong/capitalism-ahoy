const expect = require('chai').expect;
const Deck = require('../../entities/Components/Deck');
const sinon = require('sinon');

describe('Deck', () => {
  afterEach(() => sinon.restore());

  describe('shuffle', () => {
    it(`should randomize the order of the input`, () => {
      const cards = [1, 2, 3, 4, 5].map((x) => ({ id: x }));
      const randomStub = sinon.stub(Math, 'random');
      randomStub.onCall(0).returns(0.2);
      randomStub.onCall(1).returns(0.3);
      randomStub.onCall(2).returns(0.1);
      randomStub.onCall(3).returns(0.9);
      randomStub.onCall(4).returns(0.8);

      const output = Deck.shuffle(cards);

      expect(Array.isArray(output)).to.equal(
        true,
        'shuffle did not output an Array'
      );
      expect(output.map((x) => x.id)).to.deep.equal(
        [3, 4, 1, 5, 2],
        'shuffle did not output expected shuffled order'
      );
    });
  });
  describe('draw', () => {
    it('should return the topmost card and the remaining available cards from the input', () => {
      const cards = [1, 2, 3, 4, 5].map((x) => ({ id: x }));

      const { card, deck } = Deck.draw(cards);

      expect(Array.isArray(deck)).to.equal(
        true,
        'draw did not output an Array'
      );
      expect(card).to.deep.equal(
        { id: 1 },
        'draw did not output the first card on the deck'
      );
      expect(deck.length).to.equal(
        cards.length,
        'draw did not remove a card from the input'
      );
    });
  });
  describe('discard', () => {
    it('should add the input card to the second input of discarded cards', () => {
      const discardedCards = [1, 2, 3].map((x) => ({ id: x }));

      const output = Deck.discard({ id: 4 }, discardedCards);

      expect(Array.isArray(output)).to.equal(
        true,
        'discard did not output an Array'
      );
      expect(output[output.length - 1]).to.deep.equal(
        { id: 4 },
        'discard did not add the specific card input to the end of the discarded cards input'
      );
      expect(output.length).to.equal(
        discardedCards.length + 1,
        'discard did not add a card to the discarded cards input'
      );
    });
  });
  describe('replaceAvailableCards', () => {
    it('should replace first input with second input and return both', () => {
      const inputAvailableCards = [];
      const inputDiscardedCards = [1, 2, 3].map((x) => ({ id: x }));

      const { availableCards, discardedCards } = Deck.replaceAvailableCards({
        availableCards: inputAvailableCards,
        discardedCards: inputDiscardedCards,
      });

      expect(Array.isArray(availableCards)).to.equal(
        true,
        'replaceAvailableCards did not output an Array for available cards'
      );
      expect(Array.isArray(discardedCards)).to.equal(
        true,
        'replaceAvailableCards did not output an Array for discarded cards'
      );
      expect(availableCards).to.deep.equal(
        inputDiscardedCards,
        'replaceAvailableCards did not replace available cards with discarded ones from input'
      );
      expect(discardedCards).to.deep.equal(
        [],
        'replaceAvailableCards did not empty the discarded cards'
      );
    });
  });
});
