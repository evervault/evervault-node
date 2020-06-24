class SdkError extends Error {
  constructor(message) {
    super(message);
    this.type = this.constructor.name;
  }
}

class InitializationError extends SdkError {}

class ApiKeyError extends SdkError {}

class CageKeyError extends SdkError {}

const mapApiError = ({ statusCode, body }) => {
  if (statusCode === 401) return new ApiKeyError('Invalid Api Key provided.');
};

module.exports = {
  SdkError,
  CageKeyError,
  ApiKeyError,
  InitializationError,
  mapApiError,
};
