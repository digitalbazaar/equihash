/**
 * Equihash for Node.js.
 * tests.
 *
 * Copyright (c) 2017 Digital Bazaar, Inc.
 *
 * MIT License
 * <https://github.com/digitalbazaar/equihash/blob/master/LICENSE>
 */
const assert = require('assert');
const async = require('async');
const crypto = require('crypto');
const equihash = require('..');

const vectors = require('./test-vectors');

function _input(s='') {
  return crypto.createHash('sha256').update('test' + s, 'utf8').digest();
};

describe('Equihash', function() {
  it('should check proof', function(done) {
    // raw output from khovratovich cli tool
    const sol = '20e9  1396c  719e  175d9  326b  16c4a  62f7  7bc9  2760  cd1e  129fc  15899  f7c3  17082  17add  1efa4  6993  18388  17964  1c6e3  e156  152b4  10bae  11973  7a51  aba9  91bd  dde1  c85f  1dfff  10094  1bed3';
    const sola = sol.split('  ');
    const solab = new ArrayBuffer(sola.length * 4);
    const sol32 = new Uint32Array(solab);
    sola.forEach((v, i) => sol32[i] = parseInt(v, 16));
    const solb = new Buffer(solab);
    if(require('os').endianness() == 'LE') {
      solb.swap32();
    }
    const proof = {
      n: 96,
      k: 5,
      nonce: 2,
      value: solb
    };
    const inputab = new ArrayBuffer(16 * 4);
    const input32 = new Uint32Array(inputab);
    input32.fill(1);

    equihash.verify(new Uint8Array(inputab), proof, (err, verified) => {
      assert.ifError(err);
      assert(verified);
      done();
    });
  });

  const totalVectors = vectors.tests.length;
  const totalInputs = vectors.tests.reduce(
    (sum, v) => sum + v.inputs.length, 0);
  const testVectorsMsg =
    `should check ${totalVectors} vectors with ${totalInputs} inputs`;
  it(testVectorsMsg, function(done) {
    let i = 0;
    async.eachSeries(vectors.tests, (test, callback) => {
      i++;
      async.eachSeries(test.inputs, (inputs, callback) => {
        const proof = {
          n: test.n,
          k: test.k,
          nonce: test.nonce,
          value: vectors.bufferFromArray(inputs)
        };
        equihash.verify(new Uint8Array(test.seed), proof, (err, verified) => {
          assert.ifError(err);
          const expect = 'expect' in test ? test.expect : true;
          assert.equal(verified, expect, test.label || `#${i}`);
          callback();
        });
      }, err => callback(err));
    }, err => done(err));
  });
  it('should generate a n=90,k=5 proof', function(done) {
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
      assert.equal(b64proof, 'AAAD+QAABzAAABTgAAD9oAAADYkAABK4AAApqAAAQRgAAA4FAAAjfgAALZAAAKQ0AAArJAAAd00AAE8VAABz3gAABw8AAMwdAABWcgAAeQsAABVrAACLDQAAnzIAAOYEAAAI5AAAG3IAAMR6AADnoAAAG8AAAJfLAABdKAAAi5s=');
      done();
    });
  });
  /* too slow
  it('should generate a n=128,k=7 proof', function(done) {
    const options = {
      n: 128,
      k: 7
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
  */
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
    const input = _input();

    equihash.solve(input, options, (err, proof) => {
      assert.ifError(err);
      assert.equal(proof.n, options.n);
      assert.equal(proof.k, options.k);
      assert(proof.nonce);
      assert(proof.value);
      //console.log('Proper Proof Length', proof.value.length);
      equihash.verify(input, proof, (err, verified) => {
        //console.log(proof);
        assert.ifError(err);
        assert(verified);
        done();
      });
    });
  });
  it('should verify 10 proofs', function(done) {
    const options = {
      n: 90,
      k: 5
    };
    async.timesSeries(10, (n, callback) => {
      const input = _input(n);

      equihash.solve(_input(n), options, (err, proof) => {
        assert.ifError(err);
        assert.equal(proof.n, options.n);
        assert.equal(proof.k, options.k);
        assert(proof.nonce);
        assert(proof.value);
        //console.log('Proper Proof Length', proof.value.length);
        equihash.verify(input, proof, (err, verified) => {
          //console.log(proof);
          assert.ifError(err);
          assert(verified);
          callback();
        });
      });
    }, (err) => done(err));
  });
  it('should fail to verify a proof with input < k', function(done) {
    const options = {
      n: 90,
      k: 5
    };
    const input = _input();

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
      equihash.verify(input, proof, (err, verified) => {
        assert(err);
        done();
      });
    });
  });
  it('should fail to verify with an alternate input', function(done) {
    const options = {
      n: 90,
      k: 5
    };
    const input = _input();

    equihash.solve(input, options, (err, proof) => {
      assert.ifError(err);
      assert.equal(proof.n, options.n);
      assert.equal(proof.k, options.k);
      assert(proof.nonce);
      assert(proof.value);
      const inputAlternate = crypto.createHash('sha256')
        .update('goodbye cruel world', 'utf8').digest();
      equihash.verify(inputAlternate, proof, (err, verified) => {
        assert.ifError(err);
        assert(!verified);
        done();
      });
    });
  });
  it('should fail to verify an invalid proof', function(done) {
    const options = {
      n: 90,
      k: 5
    };
    const input = _input();

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
      equihash.verify(input, proof, (err, verified) => {
        assert.ifError(err);
        assert(!verified);
        done();
      });
    });
  });
  it('should fail solve with k<1', function(done) {
    const options = {
      n: 90,
      k: 0
    };
    const input = _input();

    equihash.solve(input, options, (err, proof) => {
      assert(err);
      done();
    });
  });
  it('should fail solve with k>7', function(done) {
    const options = {
      n: 90,
      k: 8
    };
    const input = _input();

    equihash.solve(input, options, (err, proof) => {
      assert(err);
      done();
    });
  });
  it('should fail solve with n/(k+1) > 32', function(done) {
    const options = {
      n: 257,
      k: 7
    };
    const input = _input();

    equihash.solve(input, options, (err, proof) => {
      assert(err);
      done();
    });
  });
  it('should fail verify with k<1', function(done) {
    const options = {
      n: 90,
      k: 5
    };
    const input = _input();

    equihash.solve(input, options, (err, proof) => {
      assert.ifError(err);
      proof.k = 0;
      equihash.verify(input, proof, (err, verified) => {
        assert(err);
        done();
      });
    });
  });
  it('should fail verify with k>7', function(done) {
    const options = {
      n: 90,
      k: 5
    };
    const input = _input();

    equihash.solve(input, options, (err, proof) => {
      assert.ifError(err);
      proof.k = 8;
      equihash.verify(input, proof, (err, verified) => {
        assert(err);
        done();
      });
    });
  });
  it('should fail verify with n/(k+1) > 32', function(done) {
    const options = {
      n: 90,
      k: 5
    };
    const input = _input();

    equihash.solve(input, options, (err, proof) => {
      assert.ifError(err);
      proof.n = 257;
      proof.k = 7;
      equihash.verify(input, proof, (err, verified) => {
        assert(err);
        done();
      });
    });
  });
});
