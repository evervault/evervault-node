const path = require('path');
const fs = require('fs');

const getLockfilePath = () => path.resolve(process.env.PWD, 'cage-lock.json');

const getCageLockIfExists = () => {
    if (!fs.existsSync(getLockfilePath())) return false;
    const retrieved = fs.readFileSync(getLockfilePath())

    if (!JSON.parse(retrieved)) return false;

    return JSON.parse(retrieved);
};

const deployCheck = (sourceHash) => {
    const cageLock = getCageLockIfExists();
    return cageLock === false || !Object.keys(cageLock.cages).includes(sourceHash);
};

const addCageToLockfile = (cage, deployedBy, deployedTeam) => {
    const existingLockfile = getCageLockIfExists() || { cages: {} };
    existingLockfile.cages[cage] = {
        deployedBy,
        deployedTeam,
        deployedAt: new Date().toString()
    };

    fs.writeFileSync(getLockfilePath(), JSON.stringify({
        type: 'cage-lock',
        updatedAt: new Date().toString(),
        cages: existingLockfile.cages,
        lastUpdatedBy: deployedBy,
        lastUpdatedTeam: deployedTeam
    }, null, 2));
}

module.exports = {
    deployCheck,
    addCageToLockfile
};