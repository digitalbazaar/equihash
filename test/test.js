const assert = require('assert');
const equihash = require('..');

describe('Equihash', function() {
  _test(equihash('khovratovich'));
});

function _test(engineId) {
  describe(engineId, function() {
    let engine;
    before(function() {
      engine = equihash(engineId);
    });
    it('should find a solution', function(done) {
      engine.find({}, (err, results) => {
        assert.ifError(err);
        assert.equal(typeof results, 'object');
        assert('solutions' in results);
        done();
      });
    });
    it('should verify a solution', function(done) {
      //engine.verify({}, done);
      done();
    });
  });
};
