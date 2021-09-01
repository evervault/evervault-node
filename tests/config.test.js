const chai = require('chai');
chai.use(require('sinon-chai'));
const { expect } = chai;
const sinon = require('sinon');

const rewire = require('rewire');
const { errors } = require('../lib/utils');

let EvervaultClient;
const encryptStub = sinon.stub();
describe('Testing the Evervault SDK Config', () => {
  beforeEach(() => {
    EvervaultClient = rewire('../lib');
    EvervaultClient.__set__({
      Crypto: () => ({
        encrypt: encryptStub,
      }),
    });
  });

  afterEach(() => {
    encryptStub.reset();
    process.env.EV_API_URL = undefined;
    process.env.EV_CAGE_RUN_URL = undefined;
    process.env.EV_TUNNEL_HOSTNAME = undefined;

  })

  context('Initialising the sdk', () => {
    const prepareSdkImport = (...args) => () => {
      return new EvervaultClient(...args);
    };

    context('No endpoint overrides exists', () => {
      it('uses the default endpoints', () => {
        const sdk = new EvervaultClient('my-api-key');
        expect(sdk.config.http.baseUrl).to.equal('https://api.evervault.com');
        expect(sdk.config.http.cageRunUrl).to.equal('https://run.evervault.com');
        expect(sdk.config.http.tunnelHostname).to.equal('https://relay.evervault.com:443');
      });
    });

    context('Endpoint overrides exist', () => {
      it('uses custom endpoints', () => {
        const relay_url = 'https://custom.url.com';
        const run_url = 'https://custom.run.url.com';
        const tunnel_hostname = 'https://custom.tunnel.url.com';

        process.env.EV_API_URL = relay_url;
        process.env.EV_CAGE_RUN_URL = run_url;
        process.env.EV_TUNNEL_HOSTNAME = tunnel_hostname;

        const sdk = new EvervaultClient('my-api-key');
        expect(sdk.config.http.baseUrl).to.equal(relay_url);
        expect(sdk.config.http.cageRunUrl).to.equal(run_url);
        expect(sdk.config.http.tunnelHostname).to.equal(tunnel_hostname);
      });
    });
  });
});
