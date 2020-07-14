// NOTE: K - I think this is actually just an interface, not a service (womp womp)

/**
 * DeckService
 * Provides the concept / feature of a Deck of Cards
 */
class DeckService {
    /**
     * Method for shuffling cards
     * @param { *[] } deck Array of covariant Card Type
     * @return { *[] } Returns the deck shuffled
     */
    static shuffle (deck) {
        throw Error("Method Not Implemented.")
    }

    /**
     * Method for drawing a card from a deck
     * @param { *[] } deck Array of covariant Card Type
     * @return {{ deck: *[], card: * }} Returns the card drawn and the deck without the card
     */
    static drawCard (deck) {
        //
    }
}