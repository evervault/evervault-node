const { expect } = require('chai');
const sinon = require('sinon');

const { RelayOutboundConfig } = require('../../lib/core');

describe('OutboundRelayConfig Module', () => {
  beforeEach(() => {
    RelayOutboundConfig.disablePolling();
    RelayOutboundConfig.clearCache();
  });

  context('constructor', () => {
    it('retrieves the Outbound Relay Config from the API and starts polling', (done) => {
      let httpStub = {
        getRelayOutboundConfig: sinon.stub().resolves({
          data: {
            outboundDestinations: {
              'example.com': {
                destinationDomain: 'example.com',
              },
              'example.org': {
                destinationDomain: 'example.org',
              },
            },
          },
          pollInterval: 0.2,
        }),
      };
      RelayOutboundConfig.init({ http: { pollInterval: 0.2 } }, httpStub).then(
        () => {
          expect(RelayOutboundConfig.getDecryptionDomains()).to.deep.equal([
            'example.com',
            'example.org',
          ]);

          httpStub.getRelayOutboundConfig = sinon.stub().resolves({
            data: {
              outboundDestinations: {
                'example.com': {
                  destinationDomain: 'example.com',
                },
              },
            },
            pollInterval: 0.2,
          });

          setTimeout(() => {
            expect(RelayOutboundConfig.getDecryptionDomains()).to.deep.equal([
              'example.com',
            ]);
            done();
          }, 500);
        }
      );
    });

    it('updates the poll interval based on the server response', async () => {
      let httpStub = {
        getRelayOutboundConfig: sinon.stub().resolves({
          data: {
            outboundDestinations: {
              'example.com': {
                destinationDomain: 'example.com',
              },
              'example.org': {
                destinationDomain: 'example.org',
              },
            },
          },
          pollInterval: 1,
        }),
      };
      await RelayOutboundConfig.init({ http: { pollInterval: 0.5 } }, httpStub);
      expect(RelayOutboundConfig.getPollingInterval()).to.equal(1);
    });
  });

  context('clearCache()', () => {
    it('clears the cache', async () => {
      let httpStub = {
        getRelayOutboundConfig: sinon.stub().resolves({
          data: {
            outboundDestinations: {
              'example.com': {
                destinationDomain: 'example.com',
              },
              'example.org': {
                destinationDomain: 'example.org',
              },
            },
          },
          pollInterval: 1,
        }),
      };
      await RelayOutboundConfig.init({ http: { pollInterval: 1 } }, httpStub);
      RelayOutboundConfig.clearCache();
      expect(RelayOutboundConfig.getDecryptionDomains()).to.be.null;
    });
  });

  context('getDecryptionDomains()', () => {
    it('returns the config', async () => {
      let httpStub = {
        getRelayOutboundConfig: sinon.stub().resolves({
          data: {
            outboundDestinations: {
              'example.com': {
                destinationDomain: 'example.com',
              },
              'example.org': {
                destinationDomain: 'example.org',
              },
            },
          },
          pollInterval: 1,
        }),
      };
      await RelayOutboundConfig.init({ http: { pollInterval: 1 } }, httpStub);
      expect(RelayOutboundConfig.getDecryptionDomains()).to.deep.equal([
        'example.com',
        'example.org',
      ]);
    });
  });

  context('disablePolling()', () => {
    it('stops polling', (done) => {
      let httpStub = {
        getRelayOutboundConfig: sinon.stub().resolves({
          data: {
            outboundDestinations: {
              'example.com': {
                destinationDomain: 'example.com',
              },
              'example.org': {
                destinationDomain: 'example.org',
              },
            },
          },
          pollInterval: 0.5,
        }),
      };
      RelayOutboundConfig.init({ http: { pollInterval: 0.5 } }, httpStub).then(
        () => {
          expect(RelayOutboundConfig.getDecryptionDomains()).to.deep.equal([
            'example.com',
            'example.org',
          ]);
          RelayOutboundConfig.disablePolling();

          httpStub = {
            getRelayOutboundConfig: sinon.stub().resolves({
              data: {
                outboundDestinations: {
                  'example.com': {
                    destinationDomain: 'example.com',
                  },
                },
              },
              pollInterval: 0.5,
            }),
          };

          setTimeout(() => {
            expect(RelayOutboundConfig.getDecryptionDomains()).to.deep.equal([
              'example.com',
              'example.org',
            ]);
            done();
          }, 500);
        }
      );
    });
  });
});
