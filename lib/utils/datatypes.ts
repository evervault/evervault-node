export const isArray = (data: any): Boolean =>
  data.constructor.name === 'Array';

export const isObject = (data: any): Boolean => typeof data === 'object';

export const isString = (data: any): Boolean => typeof data === 'string';

export const isDefined = (data: any): Boolean =>
  typeof data !== 'undefined' && data !== null;

export const isUndefined = (data: any): Boolean => !isDefined(data);

export const ensureString = (data: any): string => {
  if (isString(data)) return data.trim();
  if (['bigint', 'function'].includes(typeof data)) {
    return data.toString();
  }
  return JSON.stringify(data);
};

export const base64ToBuffer = (data: string): Buffer =>
  Buffer.from(data, 'base64');

export const utf8ToBase64 = (data: string): string =>
  Buffer.from(data, 'utf8').toString('base64');
