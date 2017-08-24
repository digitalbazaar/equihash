const assert = require('assert');
const crypto = require('crypto');
const equihash = require('..');

describe('Equihash', function() {
  it('should generate a proof', function(done) {
    const options = {
      n: 90,
      k: 5
    };
    const input =
      crypto.createHash('sha256').update('hello world', 'utf8').digest();

    equihash.solve(input, options, (err, proof) => {
      assert.ifError(err);
      assert.equal(proof.n, options.n);
      assert.equal(proof.k, options.k);
      assert(proof.nonce);
      assert(proof.value);
      const b64proof = Buffer.from(proof.value).toString('base64');
      assert.equal(b64proof, 'AAAD+QAABzAAABTgAAD9oAAAKagAAEEYAAANiQAAErgAACskAAB3TQAATxUAAHPeAAAtkAAApDQAAA4FAAAjfgAABw8AAMwdAABWcgAAeQsAAJ8yAADmBAAAFWsAAIsNAABdKAAAi5sAABvAAACXywAACOQAABtyAADEegAA56A=');
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
      assert.ifError(err);
      assert.equal(proof.n, options.n);
      assert.equal(proof.k, options.k);
      assert(proof.nonce);
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
      assert.ifError(err);
      assert.equal(proof.n, options.n);
      assert.equal(proof.k, options.k);
      assert(proof.nonce);
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
      assert.ifError(err);
      assert.equal(proof.n, options.n);
      assert.equal(proof.k, options.k);
      assert(proof.nonce);
      assert(proof.value);
      //console.log('Proper Proof Length', proof.value.length);
      assert(equihash.verify(input, proof));
      done();
    });
  });
  it('should fail to verify a proof with input < k', function(done) {
    const options = {
      n: 90,
      k: 5
    };
    const input =
      crypto.createHash('sha256').update('hello world', 'utf8').digest();

    equihash.solve(input, options, (err, proof) => {
      assert.ifError(err);
      assert.equal(proof.n, options.n);
      assert.equal(proof.k, options.k);
      assert(proof.nonce);
      assert(proof.value);
      //console.log('Proper Proof Value', proof.value);
      //console.log('Proper Proof Length', proof.value.length);
      proof.value = Buffer.from('abcde', 'base64');
      //console.log('Bad Proof Value', proof.value);
      //console.log('Verify:', equihash.verify(input, proof));
      assert(!equihash.verify(input, proof));
      done();
    });
  });
  it('should fail to verify with an alternate input', function(done) {
    const options = {
      n: 90,
      k: 5
    };
    const input =
      crypto.createHash('sha256').update('hello world', 'utf8').digest();

    equihash.solve(input, options, (err, proof) => {
      assert.ifError(err);
      assert.equal(proof.n, options.n);
      assert.equal(proof.k, options.k);
      assert(proof.nonce);
      assert(proof.value);
      const inputAlternate = crypto.createHash('sha256')
        .update('goodbye cruel world', 'utf8').digest();
      assert(!equihash.verify(inputAlternate, proof));
      done();
    });
  });
  it('should fail to verify an invalid proof', function(done) {
    const options = {
      n: 90,
      k: 5
    };
    const input =
      crypto.createHash('sha256').update('hello world', 'utf8').digest();

    equihash.solve(input, options, (err, proof) => {
      assert.ifError(err);
      assert.equal(proof.n, options.n);
      assert.equal(proof.k, options.k);
      assert(proof.nonce);
      assert(proof.value);
      // corrupt first uint32
      proof.value[0] = 0xde;
      proof.value[1] = 0xad;
      proof.value[2] = 0xbe;
      proof.value[3] = 0xef;
      assert(!equihash.verify(input, proof));
      done();
    });
  });
});
