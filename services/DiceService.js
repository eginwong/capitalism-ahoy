class DiceService {
    static roll({ quantity = 1, faces = 6}) {
        let result = [];
        for(let i = 0; i < quantity; i++) {
           result.push(Math.floor(Math.random() * faces) + 1);
        }
        return result;
    }
}

class DiceServiceAdapter {}

module.exports = {
    DiceService,
    DiceServiceAdapter
}