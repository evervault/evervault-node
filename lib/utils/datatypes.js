const isArray = (data) => data.constructor.name === 'Array';
const isObject = (data) => typeof data === 'object';
const isString = (data) => typeof data === 'string';
const isNotUndefined = (data) => typeof data !== 'undefined' && data !== null;

const ensureString = (data) => {
  if (isString(data)) return data.trim();
  if (['bigint', 'function'].includes(typeof data)) {
    return data.toString();
  }
  return JSON.stringify(data);
};

const base64ToBuffer = (data) => Buffer.from(data, 'base64');
const utf8ToBase64 = (data) => Buffer.from(data, 'utf8').toString('base64');

module.exports = {
  isArray,
  isObject,
  isString,
  isNotUndefined,
  ensureString,
  base64ToBuffer,
  utf8ToBase64,
};
