const { expect } = require('chai');
const sinon = require('sinon');
const config = require('../lib/config');
const { AttestationDoc } = require('../lib/core');

describe('attestationDoc', () => {
  context('constructor', () => {
    it('retrieves the attestation docs from relevant enclaves and starts polling', async () => {
      let httpStub = {
        getAttestationDoc: sinon.stub().resolves({
          attestation_doc: 'doc',
        }),
      };

      let enclaves = ['enclave_123', 'enclave_246'];
      let cache = new AttestationDoc(config, httpStub, enclaves, 'app_123');
      await cache.init();
      expect(await cache.get('enclave_123')).to.deep.equal('doc');
      expect(await cache.get('enclave_246')).to.deep.equal('doc');
      cache.disablePolling();
    });
  });

  context('reload', () => {
    it('the cache is updated for a single Enclave', async () => {
      const httpStub = {
        getAttestationDoc: () => {},
      };

      let stub = sinon.stub(httpStub, 'getAttestationDoc');
      stub.onCall(0).returns({ attestation_doc: 'doc1' });
      stub.onCall(1).returns({ attestation_doc: 'doc2' });
      stub.onCall(2).returns({ attestation_doc: 'doc3' });

      let enclaves = ['enclave_1', 'enclave_2'];
      let cache = new AttestationDoc(config, httpStub, enclaves, 'app_123');
      await cache.init();
      expect(await cache.get('enclave_1')).to.deep.equal('doc1');
      await cache.loadAttestationDoc('enclave_1', 'app_123');
      expect(await cache.get('enclave_1')).to.deep.equal('doc3');
      cache.disablePolling();
    });
  });

  context('poll', () => {
    it('it queries fresh attestation docs periodically', async () => {
      const mockConfig = {
        http: {
          attestationDocPollInterval: 1,
        },
      };

      const sleep = (ms) => {
        return new Promise((resolve) => setTimeout(resolve, ms));
      };

      const httpStub = {
        getAttestationDoc: () => {},
      };

      let stub = sinon.stub(httpStub, 'getAttestationDoc');
      stub.onCall(0).returns({ attestation_doc: 'doc1' });
      stub.onCall(1).returns({ attestation_doc: 'doc2' });

      let enclaves = ['enclave_1'];
      let cache = new AttestationDoc(mockConfig, httpStub, enclaves, 'app_123');
      await cache.init();
      expect(await cache.get('enclave_1')).to.deep.equal('doc1');
      await sleep(1000);
      expect(await cache.get('enclave_1')).to.deep.equal('doc2');
      cache.disablePolling();
    });
  });
});
