const ev = require('./index');
const { P256 } = require('./curves');
const evervault = new ev(
  'MjI1Nw==:XaU9HCw3xx60L8ct1sBPkcNYKbXYG6fXjAlZX4gyRkpq8de5E8BvDkAYM6PdUorP',
  { curve: 'prime256v1' }
);

evervault.encrypt('+3530860757789').then((res) => {
  console.log(res);
  evervault.run('hello-cage-novel-one', { phone: res }).then((res2) => {
    console.log(res2);
  });
});
