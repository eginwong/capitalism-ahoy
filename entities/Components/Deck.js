/**
 * Component: Deck
 * Description: Deck for shuffling, drawing, and adding cards to a discard deck
 */
module.exports = {
  // implemented from Knuth shuffle:
  //   https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
  shuffle: (cards) => {
    let currentIndex = cards.length;
    let temporaryValue;
    let randomIndex;

    // While there remain elements to shuffle...
    while (currentIndex !== 0) {
      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;

      // And swap it with the current element.
      temporaryValue = cards[currentIndex];
      cards[currentIndex] = cards[randomIndex];
      cards[randomIndex] = temporaryValue;
    }

    return cards;
  },
  draw: (cards) => ({ card: cards.shift(), deck: cards }),
  discard: (card, discardedCards) => [...discardedCards, card],
  replaceAvailableCards: ({ availableCards, discardedCards }) => {
    availableCards = discardedCards;
    discardedCards = [];
    return { availableCards, discardedCards };
  },
};
