const presets = [
  ['@babel/preset-typescript'],
  [
    '@babel/preset-env',
    {
      targets: {
        node: 'current',
      },
    },
  ],
];
const plugins = [];

module.exports = {
  plugins,
  presets,
};
