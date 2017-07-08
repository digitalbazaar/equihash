/* global should */
const assert = require('assert');
const crypto = require('crypto');
const equihash = require('..')('khovratovich');

describe('Equihash', function() {
  it('should generate a proof', function(done) {
    const options = {
      n: 90,
      k: 5
    };
    const input =
      crypto.createHash('sha256').update('hello world', 'utf8').digest();

    equihash.solve(input, options, (err, proof) => {
      assert(err === null);
      assert(proof.n === options.n);
      assert(proof.k === options.k);
      assert(proof.value);
      const b64proof = Buffer.from(proof.value).toString('base64');
      //console.log("PROOF", b64proof);
      assert(b64proof === '+QMAADAHAADgFAAAoP0AAKgpAAAYQQAAiQ0AALgSAAA=');
      done();
    });
  });
  it('should truncate seeds that are too large', function(done) {
    const options = {
      n: 90,
      k: 5
    };
    const input = crypto.randomBytes(128);

    equihash.solve(input, options, (err, proof) => {
      assert(err === null);
      assert(proof.n === options.n);
      assert(proof.k === options.k);
      assert(proof.value);
      done();
    });
  });
  it('should allow seeds that are smaller than 512 bits', function(done) {
    const options = {
      n: 90,
      k: 5
    };
    const input = crypto.randomBytes(1);

    equihash.solve(input, options, (err, proof) => {
      assert(err === null);
      assert(proof.n === options.n);
      assert(proof.k === options.k);
      assert(proof.value);
      done();
    });
  });
  it('should verify a valid proof', function(done) {
    const options = {
      n: 90,
      k: 5
    };
    const input =
      crypto.createHash('sha256').update('hello world', 'utf8').digest();

    equihash.solve(input, options, (err, proof) => {
      assert(err === null);
      assert(proof.n === options.n);
      assert(proof.k === options.k);
      assert(proof.value);
      const b64proof = Buffer.from(proof.value).toString('base64');
      assert(b64proof === '+QMAADAHAADgFAAAoP0AAKgpAAAYQQAAiQ0AALgSAAA=');
      done();
    });
  });
});
