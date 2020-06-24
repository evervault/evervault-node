/**
 * Defines the root sdk error type
 * @class
 */
class EvervaultError extends Error {
  constructor(message) {
    super(message);
    this.type = this.constructor.name;
  }
}

/**
 * Thrown in response to issues during initialization
 * @class
 */
class InitializationError extends EvervaultError {}

/**
 * Thrown in response to account level errors
 * @class
 */
class AccountError extends EvervaultError {}

/**
 * Thrown in response to issues with the api key
 * @class
 */
class ApiKeyError extends EvervaultError {}

/**
 * Thrown in response to errors retrieving a cage key
 * @class
 */
class CageKeyError extends EvervaultError {}

/**
 * Thrown in response to an unhandled status code in a response
 * @class
 */
class RequestError extends EvervaultError {}

/**
 * Map status codes from the evervault api to js errors
 * @param {Object} ApiResponse
 * @returns {EvervaultError} The appropriate evervault error
 */
const mapApiResponseToError = ({ statusCode, body }) => {
  if (statusCode === 401) return new ApiKeyError('Invalid Api Key provided.');
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
};
