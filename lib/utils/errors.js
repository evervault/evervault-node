class EvervaultError extends Error {
  constructor(message) {
    super(message);
    this.type = this.constructor.name;
  }
}

class InitializationError extends EvervaultError {}

class AccountError extends EvervaultError {}

class ApiKeyError extends EvervaultError {}

class CageKeyError extends EvervaultError {}

class RequestError extends EvervaultError {}

class CertError extends EvervaultError {}

class ForbiddenIPError extends EvervaultError {}

class DecryptError extends EvervaultError {}

class RelayOutboundConfigError extends EvervaultError {}

class UnauthorizedError extends EvervaultError {}

class ForbiddenError extends EvervaultError {}

class FunctionNotFoundError extends EvervaultError {}

class FunctionTimeoutError extends EvervaultError {}

class FunctionNotReadyError extends EvervaultError {}

class FunctionInitializationError extends EvervaultError {
  constructor(message, stack, id) {
    super(message);
    this.stack = stack;
    this.id = id;
  }
}

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

class ExceededMaxFileSizeError extends EvervaultError {}

class TokenCreationError extends EvervaultError {}

const mapFunctionFailureResponseToError = ({ error, id }) => {
  if (error) {
    if (error.message.includes('The function failed to initialize.')) {
      throw new FunctionInitializationError(error.message, error.stack, id);
    }
    throw new FunctionRuntimeError(error.message, error.stack, id);
  }
  throw new EvervaultError('An unknown error occurred.');
};

const mapFunctionResponseToError = ({ code, detail }) => {
  if (code === 'unauthorized') {
    throw new UnauthorizedError(detail);
  }
  if (code === 'forbidden') {
    throw new ForbiddenError(detail);
  }
  if (code === 'resource-not-found') {
    throw new FunctionNotFoundError(detail);
  }
  if (code === 'request-timeout') {
    throw new FunctionTimeoutError(detail);
  }
  if (code === 'function-not-ready') {
    throw new FunctionNotReadyError(detail);
  }
  if (code === 'invalid-request') {
    throw new RequestError(detail);
  }
  if (code === 'unprocessable-content') {
    throw new DecryptError(detail);
  }
  if (code === 'function/forbidden-ip') {
    throw new ForbiddenIPError(detail);
  }
  throw new EvervaultError(detail);
};

const mapApiResponseToError = ({ statusCode, body, headers }) => {
  if (statusCode === 401) return new ApiKeyError('Invalid Api Key provided.');
  if (
    statusCode === 403 &&
    headers['x-evervault-error-code'] === 'forbidden-ip-error'
  ) {
    return new ForbiddenIPError(
      body.message || "IP is not present on the invoked Cage's whitelist."
    );
  }
  if (statusCode === 403) {
    return new ApiKeyError(
      'The API key provided does not have the required permissions.'
    );
  }
  if (statusCode === 422) {
    return new DecryptError(body.message || 'Unable to decrypt data.');
  }
  if (statusCode === 423)
    return new AccountError(
      body.message ||
        'Your account is still being set up. Refer to the account status page on app.evervault.com'
    );
  if (statusCode === 424)
    return new AccountError(
      body.message ||
        'An error occurred during account creation. Please contact evervault support.'
    );
  return new RequestError(`Request returned with status [${statusCode}]`);
};

module.exports = {
  EvervaultError,
  CageKeyError,
  ApiKeyError,
  AccountError,
  InitializationError,
  mapApiResponseToError,
  mapFunctionResponseToError,
  mapFunctionFailureResponseToError,
  RequestError,
  CertError,
  DecryptError,
  ForbiddenIPError,
  RelayOutboundConfigError,
  CageAttestationError,
  ExceededMaxFileSizeError,
  TokenCreationError,
  UnauthorizedError,
  ForbiddenError,
  FunctionNotFoundError,
  FunctionTimeoutError,
  FunctionNotReadyError,
  FunctionInitializationError,
  FunctionRuntimeError,
};
