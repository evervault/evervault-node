module.exports = {
  getEnvironment: (func) => {
    const parsed = func.toString();
    const environmentVariables = {};
    var indices = [];
    for (
      var pos = parsed.indexOf('process.env');
      pos !== -1;
      pos = parsed.indexOf('process.env', pos + 1)
    ) {
      indices.push(pos);
    }

    indices.forEach((env) => {
      const startEnv = parsed.substr(env);
      const environment = startEnv.split(/[^a-zA-Z_.\d:-]/)[0].slice(12);

      environmentVariables[environment] = process.env[environment];
    });

    return environmentVariables;
  },
};
