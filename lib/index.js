/**
 * Equihash for Node.js.
 * Main entry point.
 *
 * Copyright (c) 2017 Digital Bazaar, Inc.
 *
 * MIT License
 * <https://github.com/digitalbazaar/equihash/blob/master/LICENSE>
 */
function engine(name=engine.default) {
  return require('./' + name);
}
engine.default = 'khovratovich';

module.exports = {
  engine,
  solve() {
    return engine().solve(...arguments);
  },
  verify() {
    return engine().verify(...arguments);
  },
  get PERSONALBYTES() {
    return engine().PERSONALBYTES;
  }
};
