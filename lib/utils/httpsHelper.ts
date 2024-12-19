import https from 'node:https';
import tls from 'node:tls';
import { isDefined } from './datatypes';
import { parseX509 } from './certHelper';
import HttpsProxyAgent from './proxyAgent';
import { URL } from 'node:url';
import { IncomingMessage } from 'node:http';

const origCreateSecureContext = tls.createSecureContext;
const EVERVAULT_DOMAINS = ['evervault.com', 'evervault.io', 'evervault.dev'];

interface EvervaultClient {
  getCert(): Promise<Buffer>;
}

interface X509Certificate {
  validTo: string;
  validFrom: string;
}

interface CertificateUtilResult {
  updateCertificate: () => Promise<void>;
  isCertificateInvalid: () => boolean;
}

const certificateUtil = (evClient: EvervaultClient): CertificateUtilResult => {
  let x509: X509Certificate | null = null;

  async function updateCertificate(): Promise<void> {
    const pem = await evClient.getCert();
    const cert = pem.toString();
    x509 = parseX509(cert) as X509Certificate;

    // Create a new function that wraps the original
    const newCreateSecureContext = (options: tls.SecureContextOptions) => {
      const context = origCreateSecureContext(options);
      context.context.addCACert(pem);
      return context;
    };

    // Monkey patch the tls module
    Object.defineProperty(tls, 'createSecureContext', {
      value: newCreateSecureContext,
      writable: true,
      configurable: true
    });
  }

  function isCertificateInvalid(): boolean {
    if (!isDefined(x509)) {
      return true;
    }
    const epoch = new Date().valueOf();
    return x509 ? (
      epoch > new Date(x509.validTo).valueOf() ||
      epoch < new Date(x509.validFrom).valueOf()
    ) : true;
  }

  return {
    updateCertificate,
    isCertificateInvalid,
  };
};

interface DomainFilter {
  (domain: string): boolean;
}

type RequestCallback = (res: IncomingMessage) => void;

const overloadHttpsModule = (
  apiKey: string,
  tunnelHostname: string,
  domainFilter: DomainFilter,
  debugRequests: boolean = false,
  evClient: EvervaultClient,
  originalRequest: typeof https.request
): void => {
  function getDomainFromArgs(args: any[]): string {
    if (typeof args[0] === 'string') {
      return new URL(args[0]).host;
    }

    if (args[0]?.url) {
      return args[0].url.match(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/)[0];
    }

    let domain: string | undefined;
    for (const arg of args) {
      if (arg instanceof Object) {
        domain = domain || arg.hostname || arg.host;
      }
    }
    return domain as string;
  }

  function wrapMethodRequest(this: any, ...args: any[]): ReturnType<typeof https.request> {
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

  // Monkey patch https.request
  Object.defineProperty(https, 'request', {
    value: wrapMethodRequest,
    writable: true,
    configurable: true
  });
};

interface RelayAgentConfig {
  hostname: string;
  port?: number;
  rejectUnauthorized?: boolean;
  secureProxy?: boolean;
}

const httpsRelayAgent = (
  agentConfig: RelayAgentConfig = { hostname: '', port: 443, rejectUnauthorized: true, secureProxy: true },
  evClient: EvervaultClient,
  apiKey: string
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

export {
  overloadHttpsModule,
  httpsRelayAgent,
  type EvervaultClient,
  type RelayAgentConfig,
};
