const evervault = require('.');
const ev = new evervault('MjYx:UfJOvUsnRcqveDw7M3UfJr2+c/jEEC5JSSgJj41wt9Y=');

const average = arr => arr.reduce( ( p, c ) => p + c, 0 ) / arr.length;

(async () => {
    const set = [];
    for (i = 0; i < 1000000; i++) {
        const start = process.hrtime();
        const e = await ev.encrypt('hello');
        const end = process.hrtime(start);
        const timeInMs = (end[0]* 1000000000 + end[1]) / 1000000; // convert first to ns then to ms
        set.push(timeInMs);
    }
    console.log('Mean encryption time (including first cold encrypt): ', average(set), 'ms');
    console.log('Mean encryption time (cold encrypt excluded): ', average(set.slice(1)), 'ms');
})();