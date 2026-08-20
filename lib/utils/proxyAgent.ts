import * as net from 'net';
import * as tls from 'tls';
import * as url from 'url';
import assert from 'assert';
import agentBase from 'agent-base';

// agent-base is a CommonJS module; import the default and pull `Agent` off it so
// the ESM build doesn't attempt an unsupported named import from CJS.
const { Agent } = agentBase as any;

/**
 * The `HttpsProxyAgent` implements an HTTP Agent subclass that connects to
 * the specified "HTTP(s) proxy server" in order to proxy HTTPS requests.
 *
 * Outgoing HTTP requests are first tunneled through the proxy server using the
 * `CONNECT` HTTP request method to establish a connection to the proxy server,
 * and then the proxy server connects to the destination target and issues the
 * HTTP request from the proxy server.
 *
 * `https:` requests have their socket connection upgraded to TLS once
 * the connection to the proxy server has been established.
 *
 * @api public
 */
// agent-base's Agent typings (abstract callback shape, constructor overloads)
// fight this vendored subclass; extend it untyped and rely on runtime behavior.
class HttpsProxyAgent extends (Agent as any) {
  secureProxy: boolean;
  proxy: any;
  private _updateCertificateCallback: any;
  private _isCertificateInvalidCallback: any;

  constructor(
    _opts: any,
    updateCertificateCallback?: any,
    isCertificateInvalidCallback?: any
  ) {
    let opts;
    if (typeof _opts === 'string') {
      opts = url.parse(_opts);
    } else {
      opts = _opts;
    }
    if (!opts) {
      throw new Error(
        'an HTTP(S) proxy server `host` and `port` must be specified!'
      );
    }
    super(opts);

    const proxy = { ...opts };

    // If `true`, then connect to the proxy server over TLS.
    // Defaults to `false`.
    this.secureProxy = opts.secureProxy || isHTTPS(proxy.protocol);

    // Prefer `hostname` over `host`, and set the `port` if needed.
    proxy.host = proxy.hostname || proxy.host;
    if (typeof proxy.port === 'string') {
      proxy.port = parseInt(proxy.port, 10);
    }
    if (!proxy.port && proxy.host) {
      proxy.port = this.secureProxy ? 443 : 80;
    }

    // ALPN is supported by Node.js >= v5.
    // attempt to negotiate http/1.1 for proxy servers that support http/2
    if (this.secureProxy && !('ALPNProtocols' in proxy)) {
      proxy.ALPNProtocols = ['http/1.1'];
    }

    if (proxy.host && proxy.path) {
      // If both a `host` and `path` are specified then it's most likely
      // the result of a `url.parse()` call... we need to remove the
      // `path` portion so that `net.connect()` doesn't attempt to open
      // that as a Unix socket file.
      delete proxy.path;
      delete proxy.pathname;
    }

    this._updateCertificateCallback = updateCertificateCallback;
    this._isCertificateInvalidCallback = isCertificateInvalidCallback;

    this.proxy = proxy;
  }

  /**
   * Called when the node-core HTTP client library is creating a
   * new HTTP request.
   *
   * @api protected
   */
  async callback(req: any, opts: any): Promise<any> {
    const { proxy, secureProxy } = this;

    // Wait until the proxy is ready to initialize
    if (
      isFunction(this._isCertificateInvalidCallback) &&
      this._isCertificateInvalidCallback() &&
      isFunction(this._updateCertificateCallback)
    ) {
      await this._updateCertificateCallback();
    }

    // Create a socket connection to the proxy server.
    let socket: any;
    if (secureProxy) {
      socket = tls.connect(proxy);
    } else {
      socket = net.connect(proxy);
    }

    const headers: Record<string, any> = { ...proxy.headers };
    const hostname = `${opts.host}:${opts.port}`;
    let payload = `CONNECT ${hostname} HTTP/1.1\r\n`;

    // Inject the `Proxy-Authorization` header if necessary.
    if (proxy.auth) {
      headers['Proxy-Authorization'] = proxy.auth;
    }

    // The `Host` header should only include the port
    // number when it is not the default port.
    let { host, port, secureEndpoint } = opts;
    if (!isDefaultPort(port, secureEndpoint)) {
      host += `:${port}`;
    }
    headers.Host = host;

    headers.Connection = 'close';
    for (const name of Object.keys(headers)) {
      payload += `${name}: ${headers[name]}\r\n`;
    }

    const proxyResponsePromise = parseProxyResponse(socket);

    socket.write(`${payload}\r\n`);

    const { statusCode, buffered } = await proxyResponsePromise;

    if (statusCode === 200) {
      req.once('socket', resume);

      if (opts.secureEndpoint) {
        // The proxy is connecting to a TLS server, so upgrade
        // this socket connection to a TLS connection.
        const servername = opts.servername || opts.host;
        return tls.connect({
          ...omit(opts, 'host', 'hostname', 'path', 'port'),
          socket,
          servername,
        });
      }

      return socket;
    }

    // Some other status code that's not 200... need to re-play the HTTP
    // header "data" events onto the socket once the HTTP machinery is
    // attached so that the node core `http` can parse and handle the
    // error status code.

    // Close the original socket, and a new "fake" socket is returned
    // instead, so that the proxy doesn't get the HTTP request
    // written to it (which may contain `Authorization` headers or other
    // sensitive data).
    //
    // See: https://hackerone.com/reports/541502
    socket.destroy();

    const fakeSocket = new net.Socket({ writable: false });
    fakeSocket.readable = true;

    // Need to wait for the "socket" event to re-play the "data" events.
    req.once('socket', (s: any) => {
      assert(s.listenerCount('data') > 0);

      // Replay the "buffered" Buffer onto the fake `socket`, since at
      // this point the HTTP module machinery has been hooked up for
      // the user.
      s.push(buffered);
      s.push(null);
    });

    return fakeSocket;
  }
}

function isFunction(value: any): boolean {
  return typeof value === 'function';
}

function resume(socket: any): void {
  socket.resume();
}

function isDefaultPort(port: any, secure: any): boolean {
  return Boolean((!secure && port === 80) || (secure && port === 443));
}

function isHTTPS(protocol: any): boolean {
  return typeof protocol === 'string' ? /^https:?$/i.test(protocol) : false;
}

function omit(obj: any, ...keys: string[]): any {
  const ret: any = {};

  for (let key in obj) {
    if (!keys.includes(key)) {
      ret[key] = obj[key];
    }
  }
  return ret;
}

function parseProxyResponse(
  socket: any
): Promise<{ statusCode: number; buffered: Buffer }> {
  return new Promise((resolve, reject) => {
    // we need to buffer any HTTP traffic that happens with the proxy before we get
    // the CONNECT response, so that if the response is anything other than an "200"
    // response code, then we can re-play the "data" events on the socket once the
    // HTTP parser is hooked up...
    let buffersLength = 0;
    const buffers: Buffer[] = [];

    function read() {
      const b = socket.read();
      if (b) ondata(b);
      else socket.once('readable', read);
    }

    function cleanup() {
      socket.removeListener('error', onerror);
      socket.removeListener('readable', read);
    }

    function onerror(err: any) {
      cleanup();
      reject(err);
    }

    function ondata(b: Buffer) {
      buffers.push(b);
      buffersLength += b.length;

      const buffered = Buffer.concat(buffers, buffersLength);
      const endOfHeaders = buffered.indexOf('\r\n\r\n');

      if (endOfHeaders === -1) {
        // keep buffering
        read();
        return;
      }

      const firstLine = buffered.toString('ascii', 0, buffered.indexOf('\r\n'));
      const statusCode = +firstLine.split(' ')[1];
      resolve({
        statusCode,
        buffered,
      });
    }

    socket.on('error', onerror);

    read();
  });
}

export default HttpsProxyAgent;
