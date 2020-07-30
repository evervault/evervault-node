const path = require('path');
const childProcess = require('child_process');
const { writeFileSync } = require('fs');
const errors = require('./errors');

const runDeployment = (cageName, func, functionParameters, functionRequires) => {
    const cageSource = `
    const cagifiedFn = (${func.toString().substr(0, 5) === 'async' ? func.toString() : 'async ' + func.toString()});
    exports.handler = async (event) => {
        process.env = { ...process.env, ...event.environment };
        const data = event.data;
        return await cagifiedFn(${functionParameters.map(param => `data['${param}']`).join(', ')});
    }`;

    const dependencies = {};

    functionRequires.forEach(module => {
        dependencies[module] = require(module).version
    })

    childProcess.execSync(`mkdir -p ${path.resolve(`/tmp/ev/${cageName}`)}`);

    writeFileSync(
        path.resolve(`/tmp/ev/${cageName}/package.json`), 
        JSON.stringify({
            name: cageName,
            version: '1.0.0',
            dependencies
        }, null, 2)
    );

    writeFileSync(
        path.resolve(`/tmp/ev/${cageName}/index.js`), 
        cageSource
    );

    childProcess.execSync(`(cd ${path.resolve(`/tmp/ev/${cageName}`)} && npm install -s)`, { 
        stdio: 'inherit' 
    });

    const installed = childProcess.execSync('ev info');
    if (installed.toString().substr(0,12) !== 'Signed in as' || installed.includes('No team selected')) {
        throw new errors.EvervaultError('Please ensure you have installed the Evervault CLI and are authenticated.')
    }

    childProcess.execSync(`(cd ${path.resolve(`/tmp/ev/${cageName}`)} && ev cage:deploy -f)`, { 
        stdio: 'inherit' 
    });

    return {
        cageName,
        deployedBy: installed.toString().split('Signed in as: ')[1].split("\n")[0],
        deployedTeam: {
            name: installed.toString().split('Active team: ')[1].split("\n")[0],
            id: installed.toString().split('(').reverse()[0].split(')')[0].split('\n')[0]
        }
    };
}

module.exports = {
    runDeployment
}