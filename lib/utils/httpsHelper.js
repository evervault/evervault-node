const https = require('https');
const tls = require('tls');
const Datatypes = require('./datatypes');
const certHelper = require('./certHelper');
const HttpsProxyAgent = require('./proxyAgent');
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

const overloadHttpsModule = (
  apiKey,
  tunnelHostname,
  domainFilter,
  debugRequests = false,
  evClient,
  originalRequest
) => {
  function getDomainFromArgs(args) {
    if (typeof args[0] === 'string') {
      return new URL(args[0]).host;
    }

    if (args.url) {
      return args.url.match(domainRegex)[0];
    }

    let domain;
    for (const arg of args) {
      if (arg instanceof Object) {
        domain = domain || arg.hostname || arg.host;
      }
    }
    return domain;
  }

  function wrapMethodRequest(...args) {
    const domain = getDomainFromArgs(args);
    const shouldProxy = domainFilter(domain);
    if (
      debugRequests &&
      !EVERVAULT_DOMAINS.some((evervault_domain) =>
        domain.endsWith(evervault_domain)
      )
    ) {
      console.log(
        `EVERVAULT DEBUG :: Request to domain: ${domain}, Outbound Proxy enabled: ${shouldProxy}`
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
    return originalRequest.apply(this, args);
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
};
