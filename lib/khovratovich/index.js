const addon = require('bindings')('khovratovich');

exports.solve = (input, options, callback) => {
  const parameters = {
    n: options.n || 90,
    k: options.k || 5,
    seed: input
  };

  if(parameters.k < 1 || parameters.k > 7) {
    // k must be less than 7
    // TODO: Find out why the implementation requires k < 7
    return callback(
      new Error('Equihash \'k\' parameter must be between 1 and 7.'));
  }

  addon.solve(parameters, callback);
};

exports.verify = (input, options) => {
  const parameters = {
    n: options.n || 90,
    k: options.k || 5,
    nonce: options.nonce || 1,
    seed: input,
    value: options.value
  };

  if(parameters.value.length < 128) {
    // solutions less than 128 bytes in length are invalid
    return false;
  }

  if(parameters.k < 1 || parameters.k > 7) {
    // k must be less than 7
    return false;
  }

  return addon.verify(parameters);
};
