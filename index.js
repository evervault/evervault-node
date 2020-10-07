const evervault = require('./lib');
const ev = new evervault('OA==:5+QCls33LbzgHibs8xYV/apug6Pwrmd3yGzCABrvS5g=');

const my = (number) => number * 5;

const run = ev.cagify(my, 'my');

(async () => {
    const x = await run(3);

    console.log(x);
})();