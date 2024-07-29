class EvervaultError extends Error {
  constructor(message) {
    super(message);
    this.type = this.constructor.name;
  }
}

class FunctionTimeoutError extends EvervaultError {}

class FunctionNotReadyError extends EvervaultError {}

class FunctionRuntimeError extends EvervaultError {
  constructor(message, stack, id) {
    super(message);
    this.stack = stack;
    this.id = id;
  }
}

class AttestationError extends EvervaultError {
  constructor(reason, host, cert) {
    super(reason);
    this.host = host;
    this.cert = cert;
  }
}

class MalformedAttestationData extends EvervaultError {
  constructor(message) {
    super(`Malformed attestation data provided - ${message}`);
  }
}

class InvalidInterval extends EvervaultError {
  constructor(reason) {
    super(`Invalid interval provided to repeated timer. ${reason}`);
  }
}

class ExceededMaxFileSizeError extends EvervaultError {}

class DataRolesNotSupportedError extends EvervaultError {}

class TokenCreationError extends EvervaultError {}

const mapFunctionFailureResponseToError = ({ error, id }) => {
  if (error) {
    throw new FunctionRuntimeError(error.message, error.stack, id);
  }
  throw new EvervaultError('An unknown error occurred.');
};

const mapApiResponseToError = ({ code, detail }) => {
  if (code === 'functions/request-timeout') {
    throw new FunctionTimeoutError(detail);
  }
  if (code === 'functions/function-not-ready') {
    throw new FunctionNotReadyError(detail);
  }
  throw new EvervaultError(detail);
};

const mapResponseCodeToError = ({ status, data, headers }) => {
  if (status === 401)
    return new EvervaultError('Invalid authorization provided.');
  if (
    status === 403 &&
    headers['x-evervault-error-code'] === 'forbidden-ip-error'
  ) {
    return new EvervaultError(
      data.message || "IP is not present on the invoked Enclave's whitelist."
    );
  }
  if (status === 403) {
    return new EvervaultError(
      'The API key provided does not have the required permissions.'
    );
  }
  if (status === 422) {
    return new EvervaultError(data.message || 'Unable to decrypt data.');
  }
  if (data.message) {
    return new EvervaultError(data.message);
  }
  return new EvervaultError(`Request returned with status [${status}]`);
};

module.exports = {
  EvervaultError,
  mapApiResponseToError,
  mapResponseCodeToError,
  mapFunctionFailureResponseToError,
  AttestationError,
  ExceededMaxFileSizeError,
  TokenCreationError,
  FunctionTimeoutError,
  FunctionNotReadyError,
  FunctionRuntimeError,
  MalformedAttestationData,
  InvalidInterval,
  DataRolesNotSupportedError,
};
