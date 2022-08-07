const { X509Certificate } = require('crypto');

const parseX509 = (cert) => {
  if (X509Certificate) {
    return new X509Certificate(cert);
  } else {
    const tls = require('tls');
    const net = require('net');

    const secureContext = tls.createSecureContext({
      cert,
    });
    const secureSocket = new tls.TLSSocket(new net.Socket(), { secureContext });
    const parsedCert = secureSocket.getCertificate();
    secureSocket.destroy();
    return parsedCert;
  }
};

module.exports = {
  parseX509,
};
