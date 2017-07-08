/* global should */
const assert = require('assert');
const crypto = require('crypto');
const equihash = require('..')('khovratovich');

describe('Equihash', function() {
  it('should find a solution', function(done) {
    const options = {
      n: 90,
      k: 5
    }
    const input = new Buffer('00000000000000000000000000000000');

    equihash.solve(input, options, (err, results) => {
      assert(err === null);
      assert(results.n === options.n);
      assert(results.k === options.k);
      assert(results.proof);
      const b64proof = Buffer.from(results.proof).toString('base64')
      assert(b64proof === 'GmAAAArlAABjeAAAqt8AACoNAAA3qgAANxwAAKD1AAA=');
      done();
    });
  });
  it.skip('should verify a solution', function(done) {
    //engine.verify({}, done);
    done();
  });
});
