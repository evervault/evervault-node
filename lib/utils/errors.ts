export class EvervaultError extends Error {
  type: string;
  constructor(message: string) {
    super(message);
    this.type = this.constructor.name;
  }
}

export class FunctionTimeoutError extends EvervaultError {}

export class FunctionNotReadyError extends EvervaultError {}

export class FunctionRuntimeError extends EvervaultError {
  stack: string;
  id: string;
  constructor(message: string, stack: string, id: string) {
    super(message);
    this.stack = stack;
    this.id = id;
  }
}

export class AttestationError extends EvervaultError {
  host: string;
  cert: string;
  constructor(reason: string, host: string, cert: string) {
    super(reason);
    this.host = host;
    this.cert = cert;
  }
}

export class MalformedAttestationData extends EvervaultError {
  constructor(message: string) {
    super(`Malformed attestation data provided - ${message}`);
  }
}

export class InvalidInterval extends EvervaultError {
  constructor(reason: string) {
    super(`Invalid interval provided to repeated timer. ${reason}`);
  }
}

export class ExceededMaxFileSizeError extends EvervaultError {}

export class DataRolesNotSupportedError extends EvervaultError {}

export class TokenCreationError extends EvervaultError {}

export interface FunctionFailureResponse {
  error?: {
    message: string;
    stack: string;
  };
  id: string;
}

export interface ApiErrorResponse {
  code: string;
  detail: string;
}

export interface HttpErrorResponse {
  status: number;
  data: {
    message?: string;
  };
  headers: {
    'x-evervault-error-code'?: string;
  };
}

export const mapFunctionFailureResponseToError = ({ error, id }: FunctionFailureResponse): never => {
  if (error) {
    throw new FunctionRuntimeError(error.message, error.stack, id);
  }
  throw new EvervaultError('An unknown error occurred.');
};

export const mapApiResponseToError = ({ code, detail }: ApiErrorResponse): never => {
  if (code === 'functions/request-timeout') {
    throw new FunctionTimeoutError(detail);
  }
  if (code === 'functions/function-not-ready') {
    throw new FunctionNotReadyError(detail);
  }
  throw new EvervaultError(detail);
};

export const mapResponseCodeToError = ({ status, data, headers }: HttpErrorResponse): EvervaultError => {
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
