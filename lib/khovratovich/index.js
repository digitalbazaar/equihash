const addon = require('bindings')('khovratovich');

exports.solve = (input, options, callback) => {
  const n = 'n' in options ? options.n : 90;
  const k = 'k' in options ? options.k : 5;
  const seed = input;

  if(!(k >= 1 && k <= 7)) {
    // k must be in range of [1,7]
    // TODO: Find out why the implementation requires k < 7
    return callback(
      new Error('Equihash \'k\' parameter must be from 1 to 7.'));
  }

  if((n / (k + 1)) > 32) {
    return callback(
      new Error('Equihash \'n\' and \'k\' must satisfy n/(k+1) <= 32'));
  }

  addon.solve({n, k, seed}, callback);
};

exports.verify = (input, options) => {
  const n = 'n' in options ? options.n : 90;
  const k = 'k' in options ? options.k : 5;
  const nonce = 'nonce' in options ? options.nonce : 1;
  const seed = input;
  const value = options.value;

  if(value.length < 128) {
    // solutions less than 128 bytes in length are invalid
    return false;
  }

  if(!(k >= 1 && k <= 7)) {
    // k must be in range of [1,7]
    return false;
  }

  if((n / (k + 1)) > 32) {
    return false;
  }

  return addon.verify({n, k, nonce, seed, value});
};
