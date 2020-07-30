const ev = require('.');

const e = new ev('MTE=:WzWnwo4uNnWcb7HLG6M0zboFJiD956nixaXbXth+Zw0=');

const magic = e.cagify((a, b) => Math.pow(a,b));

(async () => {
    console.log(await magic(2, 8));
})()