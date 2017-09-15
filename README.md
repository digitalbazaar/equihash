# Equihash Proof of Work for Node

[![Build Status](https://travis-ci.org/digitalbazaar/equihash.png?branch=master)](https://travis-ci.org/digitalbazaar/equihash)
[![Build Status](https://ci.digitalbazaar.com/buildStatus/icon?job=equihash)](https://ci.digitalbazaar.com/job/equihash)

Equihash is a tunable asymmetric proof of work algorithm where it is difficult
to generate a proof, but easy to verify one. The algorithm makes it difficult
to build custom hardware to generate the proof by ensuring forced CPU and
memory trade offs. The algorithm is useful for cryptocurrency mining as
well as building solutions that require a proof of work capability.

## Installation

```
npm install equihash
```

## The Equihash API

`solve(seed, options, callback(err, proof))`

Solve for a single solution.

`seed`: buffer of bytes to use as a seed

`options` (common):
- `n`: equihash `n` parameter
- `k`: equihash `k` parameter
- `nonceLength`: number of bytes of nonce data to find (optional)

`options` (engine specific):
- `personal`: buffer of "personal" bytes used in some blake2 initializations
  (optional)
- `nonce`: initial value of nonce (engine dependent type) (optional)
- `maxNonces`: max number of nonces to check (optional)

`proof`:
- `n`: equihash `n` parameter
- `k`: equihash `k` parameter
- `personal`: buffer of bytes used for "personal" bytes (engine dependent, optional)
- `nonce`: buffer of nonce bytes
- `solution`: array of unsigned integers

`verify(seed, proof, options, callback(err, verified))`

Verify a proof for a given seed.

`proof`: same as output from `solve()`

`options` (engine specific):
- `personal`: buffer of "personal" bytes used in some blake2 initializations
  (optional)
- `nonceLength`: number of bytes of nonce data if passing a number (4, optional)

`equihash.PERSONALBYTES`

If supported for the current engine, get the the number of supported
PERSONALBYTES for the blake2 implementations.  Often 16.

## Usage Example
```javascript
const equihash = require('equihash');

// seed for equihash
const seed = crypto.createHash('sha256').update('test1234', 'utf8').digest();
const options = {
  n: 90,
  k: 5,
  nonceLength: 4
}

equihash.solve(seed, options, (err, proof) => {
  if(err) {
    return console.log('Failed to generate proof:', err);
  }

  console.log('Equihash proof:', proof)

  equihash.verify(seed, proof, (err, verified) => {
    if(err) {
      return console.log('Failed to verify proof:', err);
    }

    console.log('Valid proof? ', verified);
  });
});
```

Use a specific Equihash engine:
```javascript
const equihash = require('equihash').engine('...');
// ...
```

By default the 'khovratovich' engine is used. To set a different default
engine:
```javascript
const equihash = require('equihash');
equihash.engine.default = '...';
// ...
```

## Engines

`khovratovich`:
- Uses a modified reference equihash implementation.
- Handles seed value of any length.
- Allows specifying the blake2b personal data.
- Verifies nonces of any length.
- Solver can generate nonce of any length but will only mutate first few bytes.
- Solution of unsigned 32 bit values are processed as little endian values.
- Note: Not strictly compatible with zcash implementation due to internal buffer
  issues.

## Test Suite

```
npm install
npm test
```

## Benchmark

```
npm run benchmark
```
