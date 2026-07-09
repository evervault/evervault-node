import * as crypto from 'crypto';
import * as errors from './errors';
import * as Datatypes from './datatypes';
import type { OutboundRelayOptions, SdkOptions } from '../types';

const validateApiKey = (
  appUuid: string,
  apiKey?: string,
  options: Partial<SdkOptions> = {}
): void => {
  if (options.encryptionMode === true) {
    return;
  }
  if (apiKey === '' || !Datatypes.isString(apiKey)) {
    throw new errors.EvervaultError(
      'The API key must be a string and cannot be empty.'
    );
  }
  if (apiKey.startsWith('ev:key')) {
    // Scoped API key
    const appUuidHash = crypto
      .createHash('sha512')
      .update(appUuid)
      .digest('base64')
      .slice(0, 6);
    const appUuidHashFromApiKey = apiKey.split(':')[4];
    if (appUuidHash !== appUuidHashFromApiKey) {
      throw new errors.EvervaultError(
        `The API key is not valid for app ${appUuid}. Make sure to use an API key belonging to the app ${appUuid}.`
      );
    }
  }
};

const validatePayload = (payload: any): void => {
  if (
    !Datatypes.isObjectStrict(payload) &&
    (payload != null || payload != undefined)
  ) {
    throw new errors.EvervaultError('Functions must be given an object to run');
  }
};

const validateFunctionName = (functionName: string): void => {
  if (!Datatypes.isString(functionName))
    throw new errors.EvervaultError('Function name invalid');
};

const validateRelayOutboundOptions = (
  options: OutboundRelayOptions = {}
): void => {
  if (
    (Datatypes.isDefined(options) && !Datatypes.isObjectStrict(options)) ||
    (Datatypes.isDefined(options) &&
      Datatypes.isDefined(options.decryptionDomains) &&
      !Datatypes.isArray(options.decryptionDomains)) ||
    (Datatypes.isDefined(options) &&
      Datatypes.isDefined(options.debugRequests) &&
      !Datatypes.isBoolean(options.debugRequests))
  ) {
    throw new errors.EvervaultError('Invalid options for enableOutboundRelay');
  }
};

export {
  validateApiKey,
  validatePayload,
  validateFunctionName,
  validateRelayOutboundOptions,
};
