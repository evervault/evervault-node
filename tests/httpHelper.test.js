const { httpsHelper } = require('../lib/utils');
const sinon = require('sinon');
const { expect } = require('chai');
const https = require('https');
const fs = require('fs');

describe('getDomainAndPathFromArgs', () => {
  [
    [new URL('https://a.com'), 'a.com', '/'],
    [new URL('https://a.com/b/c'), 'a.com', '/b/c'],
    ['https://a.com', 'a.com', '/'],
    ['https://a.com/b/c', 'a.com', '/b/c'],
    [{ hostname: 'a.com', pathname: '/' }, 'a.com', '/'],
    [{ host: 'a.com', path: '/' }, 'a.com', '/'],
    [{ yayForJavascript: 1 }, undefined, undefined],
  ].forEach(([url, expectedDomain, expectedPath], i) => {
    it(`works for ${JSON.stringify(url)} (${i})`, () => {
      const result = httpsHelper.getDomainAndPathFromArgs([url]);
      expect(result.domain).to.equal(expectedDomain);
      expect(result.path).to.equal(expectedPath);
    });
  });
});

describe('overload https requests', () => {
  const apiKey = 'test-api-key';
  const tunnelHostname = 'relay.evervault.com';
  const shouldNotFilter = (_domain) => {
    return false;
  };
  debugRequests = false;
  evClient = {
    getCert: sinon
      .stub()
      .returns(fs.readFileSync(`${__dirname}/utilities/ssl-cert-snakeoil.pem`)),
  };
  originalRequest = https.request;
  const testUrl = 'https://evervault.com';

  afterEach(() => {
    https.request = originalRequest;
  });

  const wasProxied = (result) => {
    return result.socket
      ? result.socket.servername === 'relay.evervault.com'
      : false;
  };

  context('will use filter domain func to ignore domains', () => {
    it('should apply filter to requests', async () => {
      httpsHelper.overloadHttpsModule(
        apiKey,
        tunnelHostname,
        shouldNotFilter,
        debugRequests,
        evClient,
        originalRequest
      );
      const axios = require('axios');

      return await axios(testUrl).then((result) => {
        expect(wasProxied(result)).to.be.false;
      });
    });
  });
});
