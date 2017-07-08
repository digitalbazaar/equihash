# Equihash Proof of Work for Node

[![Build Status](https://ci.digitalbazaar.com/buildStatus/icon?job=equihash)](https://ci.digitalbazaar.com/job/equihash)

Equihash is an asymmetric proof of work algorithm where it is difficult to
generate a proof, but easy to verify. The algorithm makes it difficult to build
custom hardware to generate the proof by ensuring forced CPU and memory
trade offs. The algorithm is useful for cryptocurrency mining as well as 
other problems that require a proof of work solution.

## Installation

```
npm install equihash
```

## The Equihash API
- solve(input, options, callback(err, proof))
- verify(proof)

## Usage Example
```javascript
const equihash = require('equihash')('khovratovich');

// input seed for equihash (up to 512 bits)
const input = new Buffer('1234');
const options = {
  n: 90,
  k: 5
}

equihash.solve(input, options, (err, proof) => {
  if(err) {
    return console.log('Failed to generate proof:', err);
  }

  console.log('Equihash proof:', proof)
  console.log('Generated valid Equihash proof: ', equihash.verify(proof));
});
```

## Test Suite

```
npm install
npm run test
```
