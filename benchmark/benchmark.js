/**
 * Equihash for Node.js.
 * benchmark.
 *
 * Copyright (c) 2017 Digital Bazaar, Inc.
 *
 * MIT License
 * <https://github.com/digitalbazaar/equihash/blob/master/LICENSE>
 */
const Benchmark = require('benchmark');
const assert = require('assert');
const async = require('async');
const equihash = require('..');
const crypto = require('crypto');
// tests and helpers
const vectors = require('../test/test-vectors');

const suite = new Benchmark.Suite;

function _seed(s='') {
  return crypto.createHash('sha256').update('test:' + s, 'utf8').digest();
}

let seed;
let i;

function _solveRandomInc({n, k, i=0, seedSize=32, minSamples}) {
  let options = {
    name: `solve n=${n},k=${k},seeds=rand-inc`,
    defer: true,
    onStart: function() {
      seed = _seed(i);
    },
    fn: function(deferred) {
      const options = {
        n: n,
        k: k
      };
      equihash.solve(seed, options, function(err, proof) {
        assert.ifError(err);
        deferred.resolve();
      });
    },
    onCycle: () => {
      i++;
      seed = _seed(i);
    }
  };
  if(minSamples) {
    options.minSamples = minSamples;
  }
  return options;
}

function _solveRandom({n, k, seedSize=32, minSamples}) {
  let options = {
    name: `solve n=${n},k=${k},seeds=rand`,
    defer: true,
    onStart: function() {
      seed = crypto.randomBytes(seedSize);
    },
    fn: function(deferred) {
      const options = {
        n: n,
        k: k
      };
      equihash.solve(seed, options, function(err, proof) {
        assert.ifError(err);
        deferred.resolve();
      });
    },
    onCycle: () => {
      seed = crypto.randomBytes(seedSize);
    }
  };
  if(minSamples) {
    options.minSamples = minSamples;
  }
  return options;
}

// test deferred test overhead
/*
suite
  .add({
    name: 'noop not deferred',
    defer: false,
    fn: () => {}
  })
  .add({
    name: 'noop deferred',
    defer: true,
    fn: deferred => {
      deferred.resolve();
    }
  });
*/

// test verify
vectors.benchmarks.forEach(test => {
  test.inputs.forEach(inputs => {
    suite.add({
      name: 'verify ' + test.label + ' (async)',
      defer: true,
      fn: deferred => {
        const proof = {
          n: test.n,
          k: test.k,
          nonce: test.nonce,
          solution: inputs
        };
        equihash.verify(new Uint8Array(test.seed), proof, (err, verified) => {
          assert.ifError(err);
          assert(verified);
          deferred.resolve();
        });
      }
    });
    suite.add({
      name: 'verify ' + test.label + ' (sync)',
      defer: true,
      fn: deferred => {
        const proof = {
          n: test.n,
          k: test.k,
          nonce: test.nonce,
          solution: inputs
        };
        const verified = equihash.verifySync(new Uint8Array(test.seed), proof);
        assert(verified);
        deferred.resolve();
      }
    });
  });
});

// test solve
suite
  .add(_solveRandomInc({n: 90, k: 5, minSamples: 10}))
  .add(_solveRandom({n: 90, k: 5, minSamples: 10}))
  .add(_solveRandomInc({n: 96, k: 5, minSamples: 10}))
  .add(_solveRandom({n: 96, k: 5, minSamples: 10}))
  .add(_solveRandom({n: 64, k: 3, minSamples: 10}))
  .add(_solveRandom({n: 128, k: 7, minSamples: 10}))
  ;

suite
  .on('start', () => {
    console.log('Benchmarking...');
  })
  .on('cycle', event => {
    console.log(String(event.target));
    const s = event.target.stats;
    console.log(`  min:${Math.min(...s.sample)} max:${Math.max(...s.sample)}`);
    console.log(`  deviation:${s.deviation} mean:${s.mean}`);
    console.log(`  moe:${s.moe} rme:${s.rme}% sem:${s.sem} var:${s.variance}`);
  })
  .on('complete', () => {
    console.log('Done.');
  })
  .run({async: true});
