const { httpsHelper } = require('../lib/utils');
const sinon = require('sinon');
const { expect } = require('chai');
const https = require('https');
const phin = require('phin');
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
  origionalRequest = https.request;
  const testUrl = 'https://evervault.com';

  afterEach(() => {
    https.request = origionalRequest;
  });

  const wasProxied = (result) => {
    return result.socket._parent
      ? result.socket._parent._host === 'relay.evervault.com'
      : false;
  };

  context('will use filter domain func to ignore domains', () => {
    it('should apply filter to requests', async () => {
      await httpsHelper.overloadHttpsModule(
        apiKey,
        tunnelHostname,
        shouldNotFilter,
        debugRequests,
        evClient,
        origionalRequest
      );

      return await phin(testUrl).then((result) => {
        expect(wasProxied(result)).to.be.false;
      });
    });
  });
});
