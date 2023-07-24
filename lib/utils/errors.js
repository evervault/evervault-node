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

class CageAttestationError extends EvervaultError {
  constructor(reason, host, cert) {
    super(reason);
    this.host = host;
    this.cert = cert;
  }
}

class ExceededMaxFileSizeError extends EvervaultError {}

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
  RequestError,
  CertError,
  DecryptError,
  ForbiddenIPError,
  RelayOutboundConfigError,
  CageAttestationError,
  ExceededMaxFileSizeError,
};
