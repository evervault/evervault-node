import { X509Certificate } from 'crypto';
import * as tls from 'tls';
import * as net from 'net';

const parseX509 = (cert: any) => {
  if (X509Certificate) {
    return new X509Certificate(cert);
  } else {
    const secureContext = tls.createSecureContext({
      cert,
    });
    const secureSocket = new tls.TLSSocket(new net.Socket(), { secureContext });
    const parsedCert = secureSocket.getCertificate();
    secureSocket.destroy();
    return parsedCert;
  }
};

export { parseX509 };
