const addon = require('bindings')('khovratovich');

exports.solve = (input, options, callback) => {
  const parameters = {
    n: options.n || 90,
    k: options.k || 5,
    seed: input
  };
  addon.solve(parameters, callback);
};

exports.verify = (solution, options, callback) => {
  console.log('verify', options);
  return callback(new Error('Not implemented'));
};
