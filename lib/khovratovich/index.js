/**
 * Equihash for Node.js.
 * khovratovich engine.
 *
 * Copyright (c) 2017 Digital Bazaar, Inc.
 *
 * MIT License
 * <https://github.com/digitalbazaar/equihash/blob/master/LICENSE>
 */
const addon = require('bindings')('khovratovich');

exports.solve = (input, options, callback) => {
  const n = 'n' in options ? options.n : 90;
  const k = 'k' in options ? options.k : 5;
  const seed = input;

  // k must be in range of [1,7]
  if(!(k >= 1 && k <= 7)) {
    // TODO: Find out why the implementation requires k < 7
    return callback(
      new Error('Equihash \'k\' parameter must be from 1 to 7.'));
  }

  if((n / (k + 1)) > 32) {
    return callback(
      new Error('Equihash \'n\' and \'k\' must satisfy n/(k+1) <= 32.'));
  }

  addon.solve({n, k, seed}, callback);
};

exports.verify = (input, options, callback) => {
  const n = 'n' in options ? options.n : 90;
  const k = 'k' in options ? options.k : 5;
  const nonce = 'nonce' in options ? options.nonce : 1;
  const seed = input;
  const value = options.value;

  // k must be in range of [1,7]
  if(!(k >= 1 && k <= 7)) {
    return callback(
      new Error('Equihash \'k\' parameter must be from 1 to 7.'));
  }

  if((n / (k + 1)) > 32) {
    return callback(
      new Error('Equihash \'n\' and \'k\' must satisfy n/(k+1) <= 32.'));
  }

  // value is array of 2^k 32 bit unsigned int values
  // each array element only uses n/(k+1) + 1 bits
  if(value.length !== (Math.pow(2,k) * 4)) {
    return callback(
      new Error('Equihash \'value\' not 2^k 32 bit values.'));
  }

  // create uint32 array, converted from big endian
  const valueDv = new DataView(value.buffer);
  const valueU32 = new Uint32Array(value.length / 4);
  for(let i = 0; i < valueU32.length; ++i) {
    valueU32[i] = valueDv.getUint32(i * 4);
  }

  // distinct indices check
  // missing from khovratovich implementation
  if(valueU32.length !== new Set(valueU32).size) {
    return callback(null, false);
    //return callback(new Error('Equihash indices not distinct.'));
  }

  // ordered indices check
  // missing from khovratovich implementation
  // array is a tree structure, check left nodes < right nodes
  for(let _k = 0; _k < k; ++_k) {
    let stride = 1 << _k;
    for(let i = 0; i < valueU32.length; i += (2 * stride)) {
      if(valueU32[i] >= valueU32[i + stride]) {
        return callback(null, false);
        //return callback(new Error('Equihash indices unordered.'));
      }
    }
  }

  addon.verify({n, k, nonce, seed, value}, callback);
};
