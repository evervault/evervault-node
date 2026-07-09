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
  id: string;

  constructor(message: string, stack: string | undefined, id: string) {
    super(message);
    this.stack = stack;
    this.id = id;
  }
}

export class AttestationError extends EvervaultError {
  host: string;
  cert: Buffer;

  constructor(reason: string, host: string, cert: Buffer) {
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

export const mapFunctionFailureResponseToError = ({
  error,
  id,
}: {
  error?: { message: string; stack?: string };
  id?: string;
}): never => {
  if (error) {
    throw new FunctionRuntimeError(error.message, error.stack, id as string);
  }
  throw new EvervaultError('An unknown error occurred.');
};

export const mapApiResponseToError = ({
  code,
  detail,
}: {
  code?: string;
  detail?: string;
}): never => {
  if (code === 'functions/request-timeout') {
    throw new FunctionTimeoutError(detail as string);
  }
  if (code === 'functions/function-not-ready') {
    throw new FunctionNotReadyError(detail as string);
  }
  throw new EvervaultError(detail as string);
};

export const mapResponseCodeToError = ({
  status,
  data,
  headers,
}: {
  status: number;
  data: { message?: string };
  headers: Record<string, unknown>;
}): EvervaultError => {
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
