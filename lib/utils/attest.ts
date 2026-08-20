import { AttestationError, MalformedAttestationData } from './errors';
import tls from 'tls';
import * as https from 'https';
import type { HttpConfig, AttestationBindings, PCRs } from '../types';
import type PcrManager from '../core/pcrManager';
import type AttestationDoc from '../core/attestationDoc';

const origCheckServerIdentity = tls.checkServerIdentity;

function parseNameAndAppFromHost(hostname: string): {
  name: string;
  appUuid: string;
} {
  const hostnameTokens = hostname.split('.');
  // Check if nonce prefix is present
  if (hostnameTokens[1] === 'attest') {
    return { name: hostnameTokens[2], appUuid: hostnameTokens[3] };
  } else {
    return { name: hostnameTokens[0], appUuid: hostnameTokens[1] };
  }
}

function attestConnection(
  hostname: string,
  cert: Buffer,
  cagePcrManager: PcrManager,
  attestationCache: AttestationDoc,
  attestationBindings: AttestationBindings
): Error | undefined {
  try {
    if (!attestationBindings == null) {
      throw new AttestationError(
        'Enclave attestation bindings have not been installed.',
        hostname,
        cert
      );
    }
    // Pull cage name from cage hostname
    const { name } = parseNameAndAppFromHost(hostname);
    // check if PCRs for this cage have been given

    const pcrs = cagePcrManager.get(name);
    let pcrsList: PCRs[] = [];
    if (Array.isArray(pcrs)) {
      pcrsList = pcrs;
    } else if (typeof pcrs === 'object') {
      pcrsList = [pcrs as PCRs];
    }

    let attestationDoc = attestationCache.get(name);

    let attestationDocBytes = Buffer.from(attestationDoc, 'base64');

    let isConnectionValid = attestationBindings.attestEnclave(
      cert,
      pcrsList,
      attestationDocBytes
    );

    if (!isConnectionValid) {
      console.warn(
        `EVERVAULT WARN :: Connection to Enclave ${name} failed attestation`
      );
      throw new AttestationError(
        `Attestation to ${name} failed`,
        hostname,
        cert
      );
    }
  } catch (err: any) {
    console.error(
      `EVERVAULT ERROR :: An unexpected error occurred while attempting to attest a connection to your Enclave`,
      err.message
    );
    return err;
  }
}

/*
 * Custom agent to handle attestation of connections to enclaves.
 * Pass this to a https request to ensure that the connection is attested.
 */
class EnclaveAgent extends https.Agent {
  config: HttpConfig;
  attestationCache: AttestationDoc;
  pcrManager: PcrManager;
  attestationBindings: AttestationBindings;

  constructor(
    option: https.AgentOptions | undefined,
    config: HttpConfig,
    attestationCache: AttestationDoc,
    pcrManager: PcrManager,
    attestationBindings: AttestationBindings
  ) {
    super(option);
    this.config = config;
    this.attestationCache = attestationCache;
    this.pcrManager = pcrManager;
    this.attestationBindings = attestationBindings;
  }

  #checkEnclaveServerIdentity = (
    hostname: string,
    cert: tls.PeerCertificate
  ): Error | undefined => {
    if (hostname.endsWith(this.config.enclavesHostname)) {
      const attestationResult = attestConnection(
        hostname,
        cert.raw,
        this.pcrManager,
        this.attestationCache,
        this.attestationBindings
      );

      if (attestationResult != null) {
        return attestationResult;
      }
    }
    return origCheckServerIdentity(hostname, cert);
  };

  // Overrides https.Agent#createConnection to force TLS attestation. Node's
  // Agent typings model this as returning a generic Duplex over RequestOptions,
  // which doesn't match the tls.connect signature used here, so the params stay
  // untyped.
  createConnection(options: any, callback: any): tls.TLSSocket {
    options.checkServerIdentity = this.#checkEnclaveServerIdentity;
    return tls.connect(options, callback);
  }
}

function addAttestationListener(
  config: HttpConfig,
  attestationCache: AttestationDoc,
  pcrManager: PcrManager,
  attestationBindings: AttestationBindings
): void {
  (tls as any).checkServerIdentity = function (
    hostname: string,
    cert: tls.PeerCertificate
  ): Error | undefined {
    // only attempt attestation if the host is a cage
    if (hostname.endsWith(config.enclavesHostname)) {
      // we expect undefined when attestation is successful, else an error
      const attestationResult = attestConnection(
        hostname,
        cert.raw,
        pcrManager,
        attestationCache,
        attestationBindings
      );

      if (attestationResult != null) {
        return attestationResult;
      }
    }
    // always perform base checks
    return origCheckServerIdentity(hostname, cert);
  };
}

/**
 * Ensure that the provided attestation data is correctly structured
 */
function validateAttestationData(providedAttestationData: unknown): void {
  const isObject = (val: unknown) =>
    val != null && typeof val === 'object' && !Array.isArray(val);

  const isFunction = (val: unknown) => typeof val === 'function';

  if (!isObject(providedAttestationData)) {
    throw new MalformedAttestationData(
      `Expected an object to be provided as attestation data, received ${
        Array.isArray(providedAttestationData)
          ? 'Array'
          : typeof providedAttestationData
      }`
    );
  }
  const containsOnlyObjects = Object.values(
    providedAttestationData as Record<string, unknown>
  ).every(
    (pcrs) =>
      isObject(pcrs) ||
      (Array.isArray(pcrs) && pcrs.every(isObject)) ||
      isFunction(pcrs)
  );
  if (!containsOnlyObjects) {
    throw new MalformedAttestationData(
      'Expected only objects, lists of objects, or functions as values in the attestation data map'
    );
  }
}

export {
  attestConnection,
  addAttestationListener,
  parseNameAndAppFromHost,
  validateAttestationData,
  EnclaveAgent,
};
