const path = require('path');
const fs = require('fs');

const getLockfilePath = () => path.resolve(process.cwd(), 'cage-lock.json');

const getCageLockIfExists = () => {
  if (!fs.existsSync(getLockfilePath())) return undefined;
  const retrieved = fs.readFileSync(getLockfilePath());

  if (!JSON.parse(retrieved)) return undefined;

  return JSON.parse(retrieved);
};

const getLatestVersion = (cageName) => {
  const cageLock = getCageLockIfExists();

  return cageLock.cages[cageName].cageVersion || undefined;
};

const deployCheck = (cageName, cageHash) => {
  const cageLock = getCageLockIfExists();
  return (
    !cageLock ||
    !Object.values(cageLock.cages).find(
      (cage) => cage.cageHash === cageHash && cage.cageName === cageName
    )
  );
};

const addCageToLockfile = (
  cageName,
  cageHash,
  deployedBy,
  deployedTeam,
  cageVersion
) => {
  const existingLockfile = getCageLockIfExists() || { cages: {} };
  existingLockfile.cages[cageName] = {
    deployedBy,
    deployedTeam,
    cageHash,
    cageName,
    cageVersion,
    deployedAt: new Date().toString(),
  };

  fs.writeFileSync(
    getLockfilePath(),
    JSON.stringify(
      {
        type: 'cage-lock',
        updatedAt: new Date().toISOString(),
        cages: existingLockfile.cages,
        lastUpdatedBy: deployedBy,
        lastUpdatedTeam: deployedTeam,
      },
      null,
      2
    )
  );
};

module.exports = {
  deployCheck,
  addCageToLockfile,
  getLatestVersion,
};
