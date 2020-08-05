const konan = require('konan');
const esprima = require('esprima');
const escodegen = require('escodegen');
const _ = require('lodash');
const haikunator = require('haikunator');
const crypto = require('crypto');

const parseFunctionArguments = (tree) => {
    const maybe = (x) => (x || {});

    const isArrowExpression = (maybe(_.first(tree.body)).type == 'ExpressionStatement');
    const params = isArrowExpression ? maybe(maybe(_.first(tree.body)).expression).params 
                                    : maybe(_.first(tree.body)).params;

    return _.map(params, 'name');
};

const getSourceHashHaiku = (seed) => {
    const hash = new haikunator({
        seed
    }).haikunate()

    return hash;
};

const getCageSHA256Hash = (cageSource) => {
    return crypto.createHash('sha256').update(cageSource).digest('hex');
};

const parseSource = (func) => {
    const stringifiedFunc = func.toString();
    const ast = esprima.parse(stringifiedFunc);
    const functionParameters = parseFunctionArguments(ast);
    const functionRequires = konan(stringifiedFunc).strings;
    const minified = escodegen.generate(ast, {
        format: {
            renumber: true,
            hexadecimal: true,
            quotes: 'auto',
            escapeless: true,
            compact: true,
            parentheses: false,
            semicolons: false
        }
    });
    const cageHash = getCageSHA256Hash(minified);
    const cageName = `cagify-${getSourceHashHaiku(cageHash)}`;

    return {
        cageName,
        cageHash,
        functionRequires,
        functionParameters
    };
}

module.exports = {
  parseSource
};
