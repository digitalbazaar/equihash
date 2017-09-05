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

exports.solve = (seed, options, callback) => {
  const n = 'n' in options ? options.n : 90;
  const k = 'k' in options ? options.k : 5;
  const nonceLength = 'nonceLength' in options ? options.nonceLength : 4;

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

  if(nonceLength < 4) {
    return callback(
      new Error('Equihash \'nonceLength\' must be >= 4 bytes.'));
  }

  // convert nonce to number
  let nonce = 'nonce' in options ? options.nonce : 1;
  if(nonce instanceof Buffer) {
    const dv = new DataView(nonce.buffer, nonce.byteOffset, nonce.byteLength);
    nonce = dv.getUint32(dv, true);
  } else if(typeof nonce !== 'number') {
    return callback(
      new Error('Equihash \'nonce\' must be buffer or number.'));
  }

  const maxNonces = 'maxNonces' in options ? options.maxNonces : 0xffff;

  if(maxNonces === 0) {
    return callback(
      new Error('Equihash \'maxNonces\' must be at least 1.'));
  }

  // limit this implementation to uin32_t range nonces
  if((0xffffffff - nonce) < (maxNonces - 1)) {
    return callback(
      new Error('Equihash \'nonce\' limited to 32 bit values.'));
  }

  addon.solve({n, k, seed, nonce, maxNonces}, function(err, proof) {
    //console.log(err, proof, proof.value.length);
    if(err) {
      return callback(err);
    }
    // create nonce bytes, encode 32 bit little endian nonce nonce at beginning
    const ab = new ArrayBuffer(nonceLength);
    const u8 = new Uint8Array(ab);
    u8.fill(0);
    const dv = new DataView(ab);
    dv.setUint32(0, proof.nonce, true);

    callback(null, {
      n: proof.n,
      k: proof.k,
      nonce: new Buffer(ab),
      solution: proof.solution});
  });
};

exports.verify = (seed, options, callback) => {
  const n = 'n' in options ? options.n : 90;
  const k = 'k' in options ? options.k : 5;
  const solution = options.solution;

  // k must be in range of [1,7]
  if(!(k >= 1 && k <= 7)) {
    return callback(
      new Error('Equihash \'k\' parameter must be from 1 to 7.'));
  }

  if((n / (k + 1)) > 32) {
    return callback(
      new Error('Equihash \'n\' and \'k\' must satisfy n/(k+1) <= 32.'));
  }

  // convert nonce to number
  let nonce = options.nonce;
  if(nonce instanceof Buffer) {
    const dv = new DataView(nonce.buffer, nonce.byteOffset, nonce.byteLength);
    nonce = dv.getUint32(dv, true);
  } else if(typeof nonce !== 'number') {
    return callback(
      new Error('Equihash \'nonce\' must be buffer or number.'));
  }

  // solution is array of 2^k 32 bit unsigned int values
  // each array element only uses n/(k+1) + 1 bits
  if(solution.length !== Math.pow(2,k)) {
    return callback(
      new Error('Equihash \'solution\' is not 2^k 32 bit values.'));
  }

  // distinct indices check
  // missing from khovratovich implementation
  if(solution.length !== new Set(solution).size) {
    return callback(null, false);
    //return callback(new Error('Equihash indices not distinct.'));
  }

  // ordered indices check
  // missing from khovratovich implementation
  // array is a tree structure, check left nodes < right nodes
  for(let _k = 0; _k < k; ++_k) {
    let stride = 1 << _k;
    for(let i = 0; i < solution.length; i += (2 * stride)) {
      if(solution[i] >= solution[i + stride]) {
        return callback(null, false);
        //return callback(new Error('Equihash indices unordered.'));
      }
    }
  }

  addon.verify({n, k, seed, nonce, solution}, callback);
};
