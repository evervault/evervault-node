export class EvervaultError extends Error {
    constructor(message: any);
    type: string;
}
export function mapApiResponseToError({ code, detail }: {
    code: any;
    detail: any;
}): never;
export function mapResponseCodeToError({ statusCode, body, headers }: {
    statusCode: any;
    body: any;
    headers: any;
}): EvervaultError;
export function mapFunctionFailureResponseToError({ error, id }: {
    error: any;
    id: any;
}): never;
export class CageAttestationError extends EvervaultError {
    constructor(reason: any, host: any, cert: any);
    host: any;
    cert: any;
}
export class ExceededMaxFileSizeError extends EvervaultError {
}
export class TokenCreationError extends EvervaultError {
}
export class FunctionTimeoutError extends EvervaultError {
}
export class FunctionNotReadyError extends EvervaultError {
}
export class FunctionRuntimeError extends EvervaultError {
    constructor(message: any, stack: any, id: any);
    stack: any;
    id: any;
}
export class InvalidInterval extends EvervaultError {
}
