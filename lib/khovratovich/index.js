console.log('khovratovich');

const addon = require('bindings')('khovratovich');

exports.solve = (options, callback) => {
  console.log('solve', options);
  return callback(new Error('Not implemented'));
};

exports.verify = (options, callback) => {
  console.log('verify', options);
  return callback(new Error('Not implemented'));
};
