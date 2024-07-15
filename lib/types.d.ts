export interface HttpConfig {
  baseUrl: string;
  userAgent: string;
  tunnelHostname: string;
  certHostname: string;
  enclavesHostname: string;
  pollInterval: string | number;
  attestationDocPollInterval: string | number;
  pcrProviderPollInterval: string | number;
  encryptionClient: boolean;
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
