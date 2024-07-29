const { httpsHelper } = require('../lib/utils');
const sinon = require('sinon');
const { expect } = require('chai');
const https = require('https');
const fs = require('fs');

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
