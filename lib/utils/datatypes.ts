export const isArray = (data: any): boolean =>
  isDefined(data) && data.constructor.name === 'Array';
export const isBuffer = (data: any): boolean =>
  data.constructor.name.toLowerCase() === 'buffer';
export const isObject = (data: any): boolean => typeof data === 'object';
export const isObjectStrict = (data: any): boolean =>
  isDefined(data) && isObject(data) && !isArray(data) && !isBuffer(data);
export const isString = (data: any): data is string => typeof data === 'string';
export const isNumber = (data: any): boolean => typeof data === 'number';
export const isDefined = (data: any): boolean =>
  typeof data !== 'undefined' && data !== null;
export const isUndefined = (data: any): boolean => typeof data === 'undefined';
export const isBoolean = (data: any): boolean => typeof data === 'boolean';
export const isFunction = (data: any): boolean => typeof data === 'function';

export const isEncryptable = (data: any): boolean =>
  isDefined(data) && (isString(data) || isNumber(data) || isBoolean(data));

export const getHeaderType = (data: any): string | undefined => {
  if (!isDefined(data)) return;
  if (isArray(data)) return 'array';
  else {
    return typeof data;
  }
};

export const ensureString = (data: any): string | undefined => {
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

const base64ToBase64Url = (base64String: string): string => {
  return base64String.replace('+', '-').replace('/', '_');
};

export const base64ToBuffer = (data: string): Buffer =>
  Buffer.from(data, 'base64');
export const utf8ToBase64Url = (data: string): string => {
  const base64 = Buffer.from(data, 'utf8').toString('base64');
  return base64ToBase64Url(base64);
};

const KEY_HEADER = '-----BEGIN PUBLIC KEY-----\n';
const KEY_FOOTER = '-----END PUBLIC KEY-----';
export const formatKey = (key: string): string => {
  if (key.includes(KEY_HEADER) && key.includes(KEY_FOOTER)) {
    return key;
  }
  return `${KEY_HEADER}${key.match(/.{0,64}/g)!.join('\n')}${KEY_FOOTER}`;
};
