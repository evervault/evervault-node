const http = require('http');
const net = require('net');
const url = require('url');

const createServer = (handlers = []) => {
  const server = http.createServer((req, res) => {
    let handled = false;

    for (const handler of handlers) {
      const { url, method, responseStatusCode, responseHeaders, responseBody } =
        handler;

      if (req.url === url && req.method === method) {
        res.writeHead(responseStatusCode, responseHeaders);
        res.end(responseBody);
        handled = true;
        break;
      }
    }

    if (!handled) {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(0, () => {
    const port = server.address().port;
    console.log(`Server is listening on port ${port}`);
  });

  return server;
};

const createProxyServer = () => {
  const server = http.createServer();

  server.on('connect', (req, cltSocket, head) => {
    const { port, hostname } = new url.URL(`http://${req.url}`);

    const srvSocket = net.connect(port || 443, hostname, () => {
      cltSocket.write(
        'HTTP/1.1 200 Connection Established\r\n' +
          'Proxy-agent: Relay proxy\r\n' +
          '\r\n'
      );
      srvSocket.write(head);
      srvSocket.pipe(cltSocket);
      cltSocket.pipe(srvSocket);
    });

    srvSocket.on('error', (err) => {
      console.error(`Error with server socket: ${err.message}`);
      cltSocket.end(`HTTP/1.1 500 Internal Server Error\r\n\r\n`);
    });

    cltSocket.on('error', (err) => {
      console.error(`Error with client socket: ${err.message}`);
      srvSocket.end();
    });
  });

  server.on('error', (err) => {
    console.error(`Server error: ${err.message}`);
  });

  server.listen(0, () => {
    const port = server.address().port;
    console.log(`Proxy server listening on port ${port}`);
  });

  return server;
};

module.exports = {
  createServer,
  createProxyServer,
};
