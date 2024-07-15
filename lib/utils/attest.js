const { AttestationError, MalformedAttestationData } = require('./errors');
const tls = require('tls');
const https = require('https');
const { hostname } = require('os');
const origCheckServerIdentity = tls.checkServerIdentity;

function parseNameAndAppFromHost(hostname) {
  const hostnameTokens = hostname.split('.');
  // Check if nonce prefix is present
  if (hostnameTokens[1] === 'attest') {
    return { name: hostnameTokens[2], appUuid: hostnameTokens[3] };
  } else {
    return { name: hostnameTokens[0], appUuid: hostnameTokens[1] };
  }
}

/**
 * @param {string} hostname
 * @param {Buffer} cert
 * @param {import('../core/pcrManager')} pcrManager
 * @param {import('../core/attestationDoc')} attestationCache
 * @param {import('../types').AttestationBindings} attestationBindings
 * @returns {Error | undefined}
 */
function attestConnection(
  hostname,
  cert,
  cagePcrManager,
  attestationCache,
  attestationBindings
) {
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
    var pcrsList = [];
    if (Array.isArray(pcrs)) {
      pcrsList = pcrs;
    } else if (typeof pcrs === 'object') {
      pcrsList = [pcrs];
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
  } catch (err) {
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
  /**
   * @param {import('https').AgentOptions} option
   * @param {import('../core/attestationDoc')} attestationCache
   * @param {import('../core/pcrManager')} pcrManager
   * @param {import('../types').AttestationBindings} attestationBindings
   * */
  constructor(
    option,
    config,
    attestationCache,
    pcrManager,
    attestationBindings
  ) {
    super(option);
    this.config = config;
    this.attestationCache = attestationCache;
    this.pcrManager = pcrManager;
    this.attestationBindings = attestationBindings;
  }

  #checkEnclaveServerIdentity = (hostname, cert) => {
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

  createConnection(options, callback) {
    options.checkServerIdentity = this.#checkEnclaveServerIdentity;
    return tls.connect(options, callback);
  }
}

/**
 *
 * @param {import('../types').HttpConfig} config
 * @param {import('../core/attestationDoc')} attestationCache
 * @param {import('../core/pcrManager')} pcrManager
 * @param {import('../types').AttestationBindings} attestationBindings
 */
function addAttestationListener(
  config,
  attestationCache,
  pcrManager,
  attestationBindings
) {
  /**
   * @param {string} hostname
   * @param {import('node:tls').PeerCertificate} cert
   * @returns {Error | undefined}
   */
  tls.checkServerIdentity = function (hostname, cert) {
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
 * @param {unknown} providedAttestationData
 * @throws {MalformedAttestationData}
 */
function validateAttestationData(providedAttestationData) {
  const isObject = (val) =>
    val != null && typeof val === 'object' && !Array.isArray(val);

  const isFunction = (val) => typeof val === 'function';

  if (!isObject(providedAttestationData)) {
    throw new MalformedAttestationData(
      `Expected an object to be provided as attestation data, received ${
        Array.isArray(providedAttestationData) ? 'Array' : typeof val
      }`
    );
  }
  const containsOnlyObjects = Object.values(providedAttestationData).every(
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

module.exports = {
  attestConnection,
  addAttestationListener,
  parseNameAndAppFromHost,
  validateAttestationData,
  EnclaveAgent,
};
