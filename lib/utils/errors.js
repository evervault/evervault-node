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

class CageAttestationError extends EvervaultError {
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

const mapResponseCodeToError = ({ statusCode, body, headers }) => {
  if (statusCode === 401)
    return new EvervaultError('Invalid authorization provided.');
  if (
    statusCode === 403 &&
    headers['x-evervault-error-code'] === 'forbidden-ip-error'
  ) {
    return new EvervaultError(
      body.message || "IP is not present on the invoked Cage's whitelist."
    );
  }
  if (statusCode === 403) {
    return new EvervaultError(
      'The API key provided does not have the required permissions.'
    );
  }
  if (statusCode === 422) {
    return new EvervaultError(body.message || 'Unable to decrypt data.');
  }
  if (body.message) {
    return new EvervaultError(body.message);
  }
  return new EvervaultError(`Request returned with status [${statusCode}]`);
};

module.exports = {
  EvervaultError,
  mapApiResponseToError,
  mapResponseCodeToError,
  mapFunctionFailureResponseToError,
  CageAttestationError,
  ExceededMaxFileSizeError,
  TokenCreationError,
  FunctionTimeoutError,
  FunctionNotReadyError,
  FunctionRuntimeError,
  MalformedAttestationData,
  InvalidInterval,
};
