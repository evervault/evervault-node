import https from 'https';
import tls from 'tls';
import * as Datatypes from './datatypes';
import * as certHelper from './certHelper';
import HttpsProxyAgent from './proxyAgent';
import config from '../config';

const proxiedMarker = config.http.proxiedMarker;
const origCreateSecureContext = tls.createSecureContext;
const EVERVAULT_DOMAINS = ['evervault.com', 'evervault.io', 'evervault.dev'];

const certificateUtil = (evClient: any) => {
  let x509: any = null;
  async function updateCertificate() {
    const pem = await evClient.getCert();
    let cert = pem.toString();
    x509 = certHelper.parseX509(cert);
    (tls as any).createSecureContext = (options: any) => {
      const context: any = origCreateSecureContext(options);
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

function getDomainAndPathFromArgs(args: any[]): {
  domain: string;
  path: string;
} {
  if (typeof args[0] === 'string') {
    const parsedUrl = new URL(args[0]);
    return { domain: parsedUrl.host, path: parsedUrl.pathname };
  }

  if (args[0] instanceof URL) {
    return { domain: args[0].host, path: args[0].pathname };
  }

  let domain: any, path: any;
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

const overloadHttpsModule = (
  apiKey: string | undefined,
  tunnelHostname: string,
  domainFilter: (domain: string, path: string) => boolean,
  debugRequests = false,
  evClient: any,
  originalRequest: typeof https.request
): void => {
  function wrapMethodRequest(this: any, ...args: any[]) {
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
    args = args.map((arg: any) => {
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
    const request: any = (originalRequest as any).apply(this, args);
    request[proxiedMarker] = shouldProxy;
    return request;
  }

  (https as any).request = wrapMethodRequest;
};

const httpsRelayAgent = (
  agentConfig: any = { port: 443, rejectUnauthorized: true, secureProxy: true },
  evClient: any,
  apiKey?: string
): HttpsProxyAgent => {
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

export { overloadHttpsModule, httpsRelayAgent, getDomainAndPathFromArgs };
