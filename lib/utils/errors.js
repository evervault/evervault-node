class SdkError extends Error {
  constructor(message) {
    super(message);
    this.type = this.constructor.name;
  }
}

class AccountError extends SdkError {}

class ApiKeyError extends SdkError {}

module.exports = {
  ApiKeyError,
  AccountError,
};
