import type { Agent as HttpAgent } from 'http';
import type { Agent as HttpsAgent } from 'https';

export interface HttpConfig {
  baseUrl: string;
  userAgent: string;
  tunnelHostname: string;
  certHostname: string;
  enclavesHostname: string;
  pollInterval: string | number;
  attestationDocPollInterval: string | number;
  pcrProviderPollInterval: string | number;
  proxiedMarker: symbol;
}

export interface CurveConfig {
  ecdhCurve: string;
  keyCycleMinutes: number;
  cipherAlgorithm: string;
  keyLength: number;
  ivLength: number;
  authTagLength: number;
  evVersion: string;
  evVersionWithMetadata: string;
  header: { iss: string; version: number };
  maxFileSizeInMB: string | number;
}

export type SupportedCurve = 'secp256k1' | 'prime256v1';

export interface CryptoConfig {
  secp256k1: CurveConfig;
  prime256v1: CurveConfig;
}

export interface MasterConfig {
  http: HttpConfig;
  encryption: CryptoConfig;
}

export interface OutboundRelayOptions {
  decryptionDomains?: string[];
  debugRequests?: boolean;
}

export interface SdkOptions {
  curve?: SupportedCurve;
  retry?: boolean;
  enableOutboundRelay?: boolean;
  encryptionMode?: boolean;
  httpAgent?: HttpAgent;
  httpsAgent?: HttpsAgent;
}

export interface PCRs {
  pcr0?: string;
  pcr1?: string;
  pcr2?: string;
  pcr8?: string;
}

export type AttestationData = PCRs | PCRs[];
export type AttestationCallback = () => Promise<AttestationData>;

export interface AttestationBindings {
  attestEnclave: (
    cert: Buffer,
    expectedPcrsList: Array<PCRs>,
    attestationDoc: Buffer
  ) => boolean;
}

/**
 * A value that can be passed to `encrypt`. Primitives, Buffers, and any nested
 * combination of objects and arrays of those are all supported.
 */
export type EncryptableData =
  | string
  | number
  | boolean
  | null
  | Buffer
  | EncryptableData[]
  | { [key: string]: EncryptableData };

/**
 * The result of encrypting a value of type `T`. The shape of the input is
 * preserved: Buffers stay Buffers, primitives become encrypted strings, and
 * objects/arrays are traversed with each leaf value encrypted.
 */
export type EncryptedData<T> = T extends Buffer
  ? Buffer
  : T extends string | number | boolean
  ? string
  : T extends null | undefined
  ? T
  : T extends Array<infer U>
  ? EncryptedData<U>[]
  : T extends object
  ? { [K in keyof T]: EncryptedData<T[K]> }
  : string;

/**
 * A value that can be passed to `decrypt`. Mirrors the shape produced by
 * `encrypt`: encrypted strings, Buffers, and nested objects/arrays of those.
 */
export type DecryptableData =
  | string
  | Buffer
  | DecryptableData[]
  | { [key: string]: DecryptableData };

/** The response returned by a successful Function run. */
export interface FunctionRunResult<T = any> {
  id: string;
  result: T;
  status: 'success';
}

/** A short-lived token used to invoke a Function from an untrusted client. */
export interface RunToken {
  token: string;
}

/** A short-lived token created via `createClientSideDecryptToken`. */
export interface ClientSideToken {
  token: string;
  createdAt: Date;
  expiry: Date;
}

/** The team/app key material returned by the keys endpoints. */
export interface TeamKeyResponse {
  key?: string;
  ecdhKey: string;
  ecdhP256Key: string;
}

/** A single outbound Relay destination entry. */
export interface RelayOutboundDestination {
  destinationDomain: string;
}

/** The body returned by the Relay Outbound configuration endpoint. */
export interface RelayOutboundConfigResponse {
  outboundDestinations: Record<string, RelayOutboundDestination>;
}
