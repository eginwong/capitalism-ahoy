const expect = require("chai").expect;
const sinon = require("sinon");
const { GameState } = require("../entities/GameState");

function gwt(strings) {
  const statements = strings.raw[0].split(" | ");
  return `GIVEN ${statements[0]} WHEN ${statements[1]} THEN ${statements[2]}`;
}

// given when then {P}C{Q}
describe("game", () => {
    describe("feature: starts", () => {
      let gameState;
      // mock?
      // spy on functions?
      beforeEach(() => {
        gameState = new GameState();
      });

      it(gwt`cold start | game is loaded | start game event should be emitted`, () => {

        // it('should invoke the callback', function(){
        // var spy = sinon.spy();
        // var emitter = new EventEmitter;

        // emitter.on('foo', spy);
        // emitter.emit('foo');
        // spy.called.should.equal.true;
        // })

        // it('should pass arguments to the callbacks', function(){
        // var spy = sinon.spy();
        // var emitter = new EventEmitter;

        // emitter.on('foo', spy);
        // emitter.emit('foo', 'bar', 'baz');
        // sinon.assert.calledOnce(spy);
        // sinon.assert.calledWith(spy, 'bar', 'baz');
        // })
        expect(gameState.turn).equal(0);
        // var callback = sinon.fake();
        // var proxy = once(callback);
    
        // proxy();
    
        // assert(callback.called);
      });

      it("given hot start when game is loaded then option should be presented to player", () => {
        // continue or start
      });
  
      it("should return -1 when the value is not present", () => {
        expect([1, 2, 3].indexOf(4)).equal(-1);
      });
    });
  
    function createPlayer({ name }) {
      return {
        name,
        position: 0,
        jailed: -1,
        cash: 1500,
        netWorth: 1500,
        getOutOfJailFreeCards: 0,
        properties: [],
      };
    }
  });