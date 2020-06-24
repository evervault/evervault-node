class SdkError extends Error {
  constructor(message) {
    super(message);
    this.type = this.constructor.name;
  }
}

class InitializationError extends SdkError {}

class AccountError extends SdkError {}

class ApiKeyError extends SdkError {}

class CageKeyError extends SdkError {}

class RequestError extends SdkError {}

const mapApiError = ({ statusCode, body }) => {
  if (statusCode === 401) return new ApiKeyError('Invalid Api Key provided.');
  if (statusCode === 423) return new AccountError(body.message);
  if (statusCode === 424) return new AccountError(body.message);
  return new RequestError(`Request returned with status [${statusCode}]`);
};

module.exports = {
  SdkError,
  CageKeyError,
  ApiKeyError,
  AccountError,
  InitializationError,
  mapApiError,
};
