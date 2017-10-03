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

// blake2b constant
exports.BLAKE2B_PERSONAL_BYTES = 16;

// difficulty constants
exports.MIN_DIFFICULTY = 0;
exports.MAX_DIFFICULTY = Number.MAX_SAFE_INTEGER;

// misc constants
exports.DEFAULT_N = 90;
exports.DEFAULT_K = 5;

exports.solve = (seed, options, callback) => {
  const n = 'n' in options ? options.n : exports.DEFAULT_N;
  const k = 'k' in options ? options.k : exports.DEFAULT_K;
  const nonceLength = 'nonceLength' in options ? options.nonceLength : 4;
  const params = options.algorithmParameters || {};
  const personalization =
    'personalization' in params ? params.personalization :
    Buffer.alloc(exports.BLAKE2B_PERSONAL_BYTES, 0);

  if('algorithm' in params && params.algorithm !== 'khovratovich') {
    return callback(
      new Error('Equihash \'algorithm\' unknown.'));
  }

  // k must be in range of [1,7]
  if(!(k >= 1 && k <= 7)) {
    // TODO: Find out why the implementation requires k < 7
    return callback(
      new RangeError('Equihash \'k\' parameter must be from 1 to 7.'));
  }

  if((n / (k + 1)) > 32) {
    return callback(
      new RangeError('Equihash \'n\' and \'k\' must satisfy n/(k+1) <= 32.'));
  }

  if(personalization.length > exports.BLAKE2B_PERSONAL_BYTES) {
    return callback(
      new RangeError('Equihash param \'personalization\' length too large.'));
  }

  if(nonceLength < 4) {
    return callback(
      new RangeError('Equihash \'nonceLength\' must be >= 4 bytes.'));
  }

  // convert nonce to buffer
  let nonce = 'nonce' in options ? options.nonce : 1;
  if(typeof nonce === 'number') {
    const ab = new ArrayBuffer(nonceLength);
    const b = Buffer.from(ab);
    b.fill(0);
    const dv = new DataView(ab);
    dv.setUint32(0, nonce, true);
    nonce = b;
  } else if(!(nonce instanceof Buffer)) {
    return callback(
      new TypeError('Equihash \'nonce\' must be buffer or number.'));
  }

  // check buffer size if length provided
  if('nonceLength' in options) {
    if(options.nonceLength !== nonce.length) {
      return callback(
        new RangeError('Equihash \'nonce\' length and \'nonceLength\' differ.'));
    }
  }

  const maxNonces = 'maxNonces' in options ? options.maxNonces : 0xffff;

  if(maxNonces === 0) {
    return callback(
      new RangeError('Equihash \'maxNonces\' must be at least 1.'));
  }

  const dv = new DataView(nonce.buffer);
  const currentNonce = dv.getUint32(0, true);
  // limit this implementation to uin32_t range nonces
  if((0xffffffff - currentNonce) < (maxNonces - 1)) {
    return callback(
      new RangeError('Equihash \'nonce\' limited to 32 bit values.'));
  }

  const difficulty = 'difficulty' in params ? params.difficulty : 0;
  if(difficulty < exports.MIN_DIFFICULTY ||
    difficulty > exports.MAX_DIFFICULTY) {
    return callback(
      new RangeError(
        'Equihash \'difficulty\' must be between ' + exports.MIN_DIFFICULTY +
        ' and ' + exports.MAX_DIFFICULTY + '.'));
  }

  addon.solve({
    n, k, personalization, seed, nonce, maxNonces, difficulty
  }, function(err, proof) {
    if(err) {
      return callback(err);
    }

    if(proof.solution.length === 0) {
      return callback(new Error('Equihash solution not found.'));
    }

    callback(null, {
      n: proof.n,
      k: proof.k,
      seed: seed,
      nonce: proof.nonce,
      solution: proof.solution,
      algorithm: 'khovratovich',
      algorithmParameters: {
        personalization: personalization,
        difficulty: difficulty
      },
      statistics: {
        nonceCount: proof.nonceCount,
        solutionCount: proof.solutionCount,
        distinctCount: proof.distinctCount,
        difficultCount: proof.difficultCount
      }
    });
  });
};

function _verifyCheck({n, k, seed, options}) {
  const params = options.algorithmParameters || {};
  const solution = options.solution;

  if('algorithm' in params && params.algorithm !== 'khovratovich') {
    throw new Error('Equihash \'algorithm\' unknown.');
  }

  // k must be in range of [1,7]
  if(!(k >= 1 && k <= 7)) {
    throw new RangeError('Equihash \'k\' parameter must be from 1 to 7.');
  }

  if((n / (k + 1)) > 32) {
    throw new RangeError(
      'Equihash \'n\' and \'k\' must satisfy n/(k+1) <= 32.');
  }

  if('personalization' in params &&
    params.personalization.length > exports.BLAKE2B_PERSONAL_BYTES) {
    throw new RangeError('Equihash \'personalization\' length too large.');
  }

  // convert nonce to buffer
  if(!(typeof options.nonce === 'number' || options.nonce instanceof Buffer)) {
    throw new TypeError('Equihash \'nonce\' must be buffer or number.');
  }

  // solution is array of 2^k 32 bit unsigned int values
  // each array element only uses n/(k+1) + 1 bits
  if(options.solution.length !== Math.pow(2,k)) {
    throw new Error('Equihash \'solution\' is not 2^k 32 bit values.');
  }

  // distinct indices check
  // missing from khovratovich implementation
  if(solution.length !== new Set(solution).size) {
    return false;
    //throw new Error('Equihash indices not distinct.');
  }

  // ordered indices check
  // missing from khovratovich implementation
  // array is a tree structure, check left nodes < right nodes
  for(let _k = 0; _k < k; ++_k) {
    const stride = 1 << _k;
    for(let i = 0; i < solution.length; i += (2 * stride)) {
      if(solution[i] >= solution[i + stride]) {
        return false;
        //throw new Error('Equihash indices not ordered.');
      }
    }
  }

  return true;
}

function _nonceAsBuffer(nonce, nonceLength) {
  // convert nonce to buffer
  if(typeof nonce === 'number') {
    const ab = new ArrayBuffer(nonceLength);
    const b = Buffer.from(ab);
    b.fill(0);
    const dv = new DataView(ab);
    dv.setUint32(0, nonce, true);
    return b;
  }
  return nonce;
}

exports.verify = (seed, options, callback) => {
  const n = 'n' in options ? options.n : exports.DEFAULT_N;
  const k = 'k' in options ? options.k : exports.DEFAULT_K;
  const nonceLength = 'nonceLength' in options ? options.nonceLength : 4;
  const params = options.algorithmParameters || {};
  const personalization = 'personalization' in params ? params.personalization :
    Buffer.alloc(exports.BLAKE2B_PERSONAL_BYTES, 0);
  const solution = options.solution;

  try {
    if(!_verifyCheck({n, k, seed, options})) {
      return callback(null, false);
    };
  } catch(e) {
    return callback(e);
  }
  const nonce = _nonceAsBuffer(options.nonce, nonceLength);

  addon.verify({n, k, personalization, seed, nonce, solution}, callback);
};

exports.verifySync = (seed, options) => {
  const n = 'n' in options ? options.n : exports.DEFAULT_N;
  const k = 'k' in options ? options.k : exports.DEFAULT_K5;
  const nonceLength = 'nonceLength' in options ? options.nonceLength : 4;
  const params = options.algorithmParameters || {};
  const personalization = 'personalization' in params ? params.personalization :
    Buffer.alloc(exports.BLAKE2B_PERSONAL_BYTES, 0);
  const solution = options.solution;

  if(!_verifyCheck({n, k, seed, options})) {
    return false;
  }
  const nonce = _nonceAsBuffer(options.nonce, nonceLength);

  return addon.verifySync({n, k, personalization, seed, nonce, solution});
};

