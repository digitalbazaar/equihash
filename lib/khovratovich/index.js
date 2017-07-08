const addon = require('bindings')('khovratovich');

exports.solve = (input, options, callback) => {
  const parameters = {
    n: options.n || 90,
    k: options.k || 5,
    seed: input
  };
  addon.solve(parameters, callback);
};

exports.verify = (input, options, callback) => {
  const parameters = {
    n: options.n || 90,
    k: options.k || 5,
    nonce: options.nonce || 1,
    seed: input,
    value: options.value
  };
  return addon.verify(parameters);
};
