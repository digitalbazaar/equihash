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
  },
  zcashPersonal(n, k) {
    // setup zcash personal buffer for given n and k
    const personal = Buffer.alloc(16, 0);
    // zcash string
    Buffer.from('ZcashPoW').copy(personal);
    const dataView = new DataView(personal.buffer);
    // 32 bit little endian n and k
    dataView.setUint32(8, n, true);
    dataView.setUint32(12, k, true);
    return personal;
  }
};
