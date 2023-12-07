/**
 * @param {String} apiKey
 * @returns {void}
 */
export function overloadHttpsModule(apiKey: string, tunnelHostname: any, domainFilter: any, debugRequests: boolean, evClient: any, originalRequest: any): void;
export function httpsRelayAgent(agentConfig: {
    port: number;
    rejectUnauthorized: boolean;
    secureProxy: boolean;
}, evClient: any, apiKey: any): HttpsProxyAgent;
import HttpsProxyAgent = require("./proxyAgent");
