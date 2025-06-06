const https = require('https');
const tls = require('tls');
const Datatypes = require('./datatypes');
const certHelper = require('./certHelper');
const HttpsProxyAgent = require('./proxyAgent');
const {
  http: { proxiedMarker },
} = require('../config');
const origCreateSecureContext = tls.createSecureContext;
const EVERVAULT_DOMAINS = ['evervault.com', 'evervault.io', 'evervault.dev'];

const certificateUtil = (evClient) => {
  let x509 = null;
  async function updateCertificate() {
    const pem = await evClient.getCert();
    let cert = pem.toString();
    x509 = certHelper.parseX509(cert);
    tls.createSecureContext = (options) => {
      const context = origCreateSecureContext(options);
      context.context.addCACert(pem);
      return context;
    };
  }

  function isCertificateInvalid() {
    if (!Datatypes.isDefined(x509)) {
      return true;
    }
    const epoch = new Date().valueOf();
    return (
      epoch > new Date(x509.validTo).valueOf() ||
      epoch < new Date(x509.validFrom).valueOf()
    );
  }

  return {
    updateCertificate,
    isCertificateInvalid,
  };
};

/**
 *
 * @param {Parameters<typeof import('node:https').request>} args
 * @returns {{ domain: string, path: string }}
 */
function getDomainAndPathFromArgs(args) {
  if (typeof args[0] === 'string') {
    const parsedUrl = new URL(args[0]);
    return { domain: parsedUrl.host, path: parsedUrl.pathname };
  }

  if (args[0] instanceof URL) {
    return { domain: args[0].host, path: args[0].pathname };
  }

  let domain, path;
  for (const arg of args) {
    if (arg instanceof Object) {
      domain = domain ?? arg.hostname ?? arg.host;
      path = path ?? arg.pathname ?? arg.path;
    }
  }
  return {
    domain,
    path,
  };
}

/**
 * @param {string} apiKey
 * @param {string} tunnelHostname
 * @param {(domain: string, path: string) => boolean} domainFilter
 * @param {boolean} debugRequests
 * @param {ReturnType<typeof import('../core/http')>} evClient
 * @param {typeof import('node:https').request} originalRequest
 * @returns {void}
 */
const overloadHttpsModule = (
  apiKey,
  tunnelHostname,
  domainFilter,
  debugRequests = false,
  evClient,
  originalRequest
) => {
  /**
   * @param {Parameters<typeof import('node:https').request>} args
   * @returns {ReturnType<typeof import('node:https').request>}
   */
  function wrapMethodRequest(...args) {
    const { domain, path } = getDomainAndPathFromArgs(args);
    const shouldProxy = !!domain && domainFilter(domain, path);
    if (
      debugRequests &&
      !EVERVAULT_DOMAINS.some((evervault_domain) =>
        domain.endsWith(evervault_domain)
      )
    ) {
      console.log(
        `EVERVAULT DEBUG :: Request to domain: ${domain}${path}, Outbound Proxy enabled: ${shouldProxy}`
      );
    }
    args = args.map((arg) => {
      if (shouldProxy && arg instanceof Object) {
        const { updateCertificate, isCertificateInvalid } =
          certificateUtil(evClient);
        arg.agent = new HttpsProxyAgent(
          tunnelHostname,
          updateCertificate,
          isCertificateInvalid
        );
        arg.headers = { ...arg.headers, 'Proxy-Authorization': apiKey };
      }
      return arg;
    });
    const request = originalRequest.apply(this, args);
    request[proxiedMarker] = shouldProxy;
    return request;
  }

  https.request = wrapMethodRequest;
};

const httpsRelayAgent = (
  agentConfig = { port: 443, rejectUnauthorized: true, secureProxy: true },
  evClient,
  apiKey
) => {
  const { updateCertificate, isCertificateInvalid } = certificateUtil(evClient);
  const parsedUrl = new URL(agentConfig.hostname);
  const agent = new HttpsProxyAgent(
    {
      host: parsedUrl.hostname,
      port: parsedUrl.port || agentConfig.port,
      secureProxy: true,
      auth: apiKey,
      rejectUnauthorized: agentConfig.rejectUnauthorized,
    },
    updateCertificate,
    isCertificateInvalid
  );

  return agent;
};

module.exports = {
  overloadHttpsModule,
  httpsRelayAgent,
  getDomainAndPathFromArgs,
};
