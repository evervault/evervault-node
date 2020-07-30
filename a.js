const ev = require('.')
const e = new ev("MTE=:WzWnwo4uNnWcb7HLG6M0zboFJiD956nixaXbXth+Zw0=");

const magic = e.cagify((x, y) => x * y);

(async () => {
    while (true) {
    const a = await magic(8, 6);
    }
    console.log(a);
})();
