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
  }
};
