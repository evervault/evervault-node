const isArray = (data) => data.constructor.name === 'Array';
const isBuffer = (data) => data.constructor.name.toLowerCase() === 'buffer';
const isObject = (data) => typeof data === 'object';
const isObjectStrict = (data) =>
  isDefined(data) && isObject(data) && !isArray(data) && !isBuffer(data);
const isString = (data) => typeof data === 'string';
const isNumber = (data) => typeof data === 'number';
const isDefined = (data) => typeof data !== 'undefined' && data !== null;
const isUndefined = (data) => typeof data === 'undefined';
const isBoolean = (data) => typeof data === 'boolean';
const isFunction = (data) => typeof data === 'function';

const isEncryptable = (data) =>
  isDefined(data) &&
  (isArray(data) || isString(data) || isNumber(data) || isBoolean(data));

const getHeaderType = (data) => {
  if (!isDefined(data)) return;
  if (isArray(data)) return data.constructor.name;
  else {
    return typeof data;
  }
};

const ensureString = (data) => {
  if (isUndefined(data)) return;

  if (!isDefined(data)) return JSON.stringify(data);
  if (isString(data)) return data.trim();
  if (['bigint', 'function'].includes(typeof data)) {
    return data.toString();
  }
  if (isBuffer(data)) {
    return data.toString('utf8');
  }
  return JSON.stringify(data);
};

const base64ToBase64Url = (base64String) => {
  return base64String.replace('+', '-').replace('/', '_');
};

const base64ToBuffer = (data) => Buffer.from(data, 'base64');
const utf8ToBase64Url = (data) => {
  const base64 = Buffer.from(data, 'utf8').toString('base64');
  return base64ToBase64Url(base64);
};

const KEY_HEADER = '-----BEGIN PUBLIC KEY-----\n';
const KEY_FOOTER = '-----END PUBLIC KEY-----';
const formatKey = (key) => {
  if (key.includes(KEY_HEADER) && key.includes(KEY_FOOTER)) {
    return key;
  }
  return `${KEY_HEADER}${key.match(/.{0,64}/g).join('\n')}${KEY_FOOTER}`;
};

module.exports = {
  isArray,
  isObject,
  isObjectStrict,
  isBuffer,
  isString,
  isFunction,
  isEncryptable,
  isNumber,
  getHeaderType,
  isDefined,
  isUndefined,
  ensureString,
  base64ToBuffer,
  utf8ToBase64Url,
  formatKey,
};
