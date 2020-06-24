class SdkError extends Error {
  constructor(message) {
    super(message);
    this.type = this.constructor.name;
  }
}

class ApiKeyError extends SdkError {
  constructor(message) {
    super(message);
  }
}

module.exports = {
  ApiKeyError,
};
