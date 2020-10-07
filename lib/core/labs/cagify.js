const { Datatypes, errors, sourceParser, cageLock, deploy, environment } = require('../../utils');

const cagify = (func, cageName) => {
    if (!Datatypes.isFunction(func)) {
        throw new errors.EvervaultError('Cagify must be provided with a function to run');
    }
    if (!Datatypes.isString(cageName) || cageName.length === 0) {
        throw new errors.EvervaultError('Cagify must be provided with a cage name to run');
    }

    const { cageHash, functionRequires, functionParameters } = sourceParser.parseSource(func);
    if (cageLock.deployCheck(cageName, cageHash)) {
        const { deployedBy, deployedTeam, deployedVersion } = deploy.runDeployment(cageName, func, functionParameters, functionRequires);
        cageLock.addCageToLockfile(cageName, cageHash, deployedBy, deployedTeam, deployedVersion);
    }

    return async (...parameters) => {
        const data = {};
        parameters.forEach((param, index) => {
            data[functionParameters[index]] = param;
        })

        const runtimeObject = {
            environment: await this.encrypt(environment.getEnvironment(func)),
            data
        };

        const result = await this.run(cageName, runtimeObject);

        if (result.statusCode === 404) throw new errors.EvervaultError('API key mismatch: please ensure you have switched to your app\'s team in the CLI');
        return result.result;
    };
};

module.exports = cagify;