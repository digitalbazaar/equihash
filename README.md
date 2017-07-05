Equihash proof-of-work
======================

Installation
------------

```
npm install equihash
```

Engines
-------

- khovratovich
  - https://github.com/khovratovich/equihash.git

Usage
-----

```js
const equihash = require('equihash')('khovratovich');
equihash.solve(input, options, (err, solutions) => {
  // handle err or process solutions
});
equiash.verify(solution, err => {
  // handle err else success
});
```

Testing
-------

...
