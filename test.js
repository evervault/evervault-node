const fs = require('fs');
const Evervault = require('./lib');
const evervault = new Evervault(
  'APP_UUID',
  'KEY',
  // { curve: 'prime256v1'}
);

(async () => {
  const data = Buffer.from("hello world!");
  const enc = await evervault.encrypt(data);
  fs.writeFile('file.txt', enc, (err) => {
    console.log(err);
  });
})();
