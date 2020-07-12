class DiceService {
    static roll(param) {
        const diceQuantity = param && param.diceQuantity || 1;
        const diceFaces = param && param.diceFaces || 6;
        let result = [];
        for(let i = 0; i < diceQuantity; i++) {
           result.push(Math.floor(Math.random() * diceFaces) + 1);
        }
        return result;
    }
}

class DiceServiceAdapter {}

module.exports = {
    DiceService,
    DiceServiceAdapter
}