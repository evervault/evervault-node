/// <reference types="node" />
/// <reference types="node" />
export = HttpsProxyAgent;
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
declare class HttpsProxyAgent extends Agent {
    constructor(_opts: any, updateCertificateCallback: any, isCertificateInvalidCallback: any);
    secureProxy: any;
    _updateCertificateCallback: any;
    _isCertificateInvalidCallback: any;
    proxy: any;
    /**
     * Called when the node-core HTTP client library is creating a
     * new HTTP request.
     *
     * @api protected
     */
    callback(req: any, opts: any): Promise<tls.TLSSocket | net.Socket>;
}
import { Agent } from "agent-base";
import tls = require("tls");
import net = require("net");
