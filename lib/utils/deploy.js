const path = require('path');
const childProcess = require('child_process');
const fs = require('fs');
const errors = require('./errors');

const getPackagePath = () => path.resolve(process.cwd(), 'package.json');

const getPackageFileIfExists = () => {
  if (!fs.existsSync(getPackagePath())) return undefined;
  const retrieved = fs.readFileSync(getPackagePath());

  if (!JSON.parse(retrieved)) return undefined;

  return JSON.parse(retrieved);
};

const runDeployment = (
  cageName,
  func,
  functionParameters,
  functionRequires
) => {
  const cageSource = `
    const cagifiedFn = (${
      func.toString().substr(0, 5) === 'async'
        ? func.toString()
        : 'async ' + func.toString()
    });
    exports.handler = async (event) => {
        process.env = { ...process.env, ...event.environment };
        const data = event.data;
        return await cagifiedFn(${functionParameters
          .map((param) => `data['${param}']`)
          .join(', ')});
    }`;

  const dependencies = {};
  const packageFile = getPackageFileIfExists();
  functionRequires.forEach((module) => {
    if (
      packageFile &&
      packageFile.dependencies &&
      Object.keys(packageFile.dependencies).includes(module)
    ) {
      dependencies[module] = packageFile.dependencies[module];
    } else {
      dependencies[module] = 'latest';
    }
  });

  childProcess.execSync(`mkdir -p ${path.resolve(`/tmp/ev/${cageName}`)}`);

  fs.writeFileSync(
    path.resolve(`/tmp/ev/${cageName}/package.json`),
    JSON.stringify(
      {
        name: cageName,
        version: '1.0.0',
        dependencies,
      },
      null,
      2
    )
  );

  fs.writeFileSync(path.resolve(`/tmp/ev/${cageName}/index.js`), cageSource);

  if (dependencies.length > 0) {
    console.log('Installing Cage npm packages…');
    childProcess.execSync(
      `(cd ${path.resolve(`/tmp/ev/${cageName}`)} && npm install -s)`
    );
  }

  const installed = childProcess.execSync('ev info');
  if (
    installed.toString().substr(0, 12) !== 'Signed in as' ||
    installed.includes('No team selected')
  ) {
    throw new errors.EvervaultError(
      'Please ensure you have installed the Evervault CLI and are authenticated.'
    );
  }

  console.log('Deploying Cage `' + cageName + '`…');
  const deployed = childProcess.execSync(
    `(cd ${path.resolve(`/tmp/ev/${cageName}`)} && ev cage:deploy)`
  );

  if (!deployed.toString().includes('successfully')) {
    throw new errors.EvervaultError(
      'Cage failed to deploy. Contact hey@evervault.com for help.'
    );
  }

  return {
    cageName,
    deployedBy: installed.toString().split('Signed in as: ')[1].split('\n')[0],
    deployedTeam: {
      name: installed.toString().split('Active team: ')[1].split('\n')[0],
      id: installed
        .toString()
        .split('(')
        .reverse()[0]
        .split(')')[0]
        .split('\n')[0],
    },
    deployedVersion: deployed.toString().split('(version ')[1].split(')')[0],
  };
};

module.exports = {
  runDeployment,
};
