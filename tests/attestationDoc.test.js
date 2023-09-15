const { expect } = require('chai');
const sinon = require('sinon');

const attestationDoc = require('../lib/core/cageAttestationDoc');
const config = require('../lib/config');
const { AttestationDoc } = require('../lib/core');

describe('cageAttestationDoc', () => {
  context('constructor', () => {
    it('retrieves the attestation docs from relevant cages and starts polling', async () => {
      let httpStub = {
        getCageAttestationDoc: sinon.stub().resolves({
          attestation_doc: 'doc',
        }),
      };

      let cages = ['cage_123', 'cage_246'];
      let cache = new AttestationDoc(config(), httpStub, cages, 'app_123');
      await cache.init();
      expect(cache.get('cage_123')).to.deep.equal('doc');
      expect(cache.get('cage_246')).to.deep.equal('doc');
      cache.disablePolling();
    });
  });

  context('reload', () => {
    it('the cache is updated for a single Cage', async () => {
      const httpStub = {
        getCageAttestationDoc: () => {},
      };

      let stub = sinon.stub(httpStub, 'getCageAttestationDoc');
      stub.onCall(0).returns({ attestation_doc: 'doc1' });
      stub.onCall(1).returns({ attestation_doc: 'doc2' });
      stub.onCall(2).returns({ attestation_doc: 'doc3' });

      let cages = ['cage_1', 'cage_2'];
      let cache = new AttestationDoc(config(), httpStub, cages, 'app_123');
      await cache.init();
      expect(cache.get('cage_1')).to.deep.equal('doc1');
      await cache.reloadCageDoc('cage_1', 'app_123');
      expect(cache.get('cage_1')).to.deep.equal('doc3');
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
        getCageAttestationDoc: () => {},
      };

      let stub = sinon.stub(httpStub, 'getCageAttestationDoc');
      stub.onCall(0).returns({ attestation_doc: 'doc1' });
      stub.onCall(1).returns({ attestation_doc: 'doc2' });

      let cages = ['cage_1'];
      let cache = new AttestationDoc(mockConfig, httpStub, cages, 'app_123');
      await cache.init();
      expect(cache.get('cage_1')).to.deep.equal('doc1');
      await sleep(1000);
      expect(cache.get('cage_1')).to.deep.equal('doc2');
      cache.disablePolling();
    });
  });
});
