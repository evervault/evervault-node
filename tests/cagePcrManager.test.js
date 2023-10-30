const { expect } = require('chai');
const sinon = require('sinon');
const config = require('../lib/config');
const { CagePcrManager } = require('../lib/core');

describe('cagePcrManager', () => {
  context('constructor', () => {
    let testPcrs1, testPcrs2;

    beforeEach(() => {
      testPcrs1 = {
        pcr0: '0'.repeat(96),
        pcr1: '1'.repeat(96),
        pcr2: '2'.repeat(96),
        pcr8: '8'.repeat(96),
      };

      testPcrs2 = {
        pcr0: '4'.repeat(96),
        pcr1: '5'.repeat(96),
        pcr2: '6'.repeat(96),
        pcr8: '7'.repeat(96),
      };
    });

    it('retrieves the attestation docs from a provider and starts polling', async () => {
      let testProvider = () => {
        return new Promise((resolve) => {
          resolve([testPcrs1]);
        });
      };

      let testAttestationData = { cage_123: testProvider };

      let manager = new CagePcrManager(config(), testAttestationData);

      await manager.init();

      expect(await manager.get('cage_123')).to.deep.equal([testPcrs1]);

      manager.disablePolling();
    });

    it('retrieves the attestation docs from a hardcoded array and starts polling', async () => {
      let hardcodedArrayProvider = [testPcrs1, testPcrs2];

      let testAttestationData = { cage_123: hardcodedArrayProvider };

      let manager = new CagePcrManager(config(), testAttestationData);

      await manager.init();

      expect(await manager.get('cage_123')).to.deep.equal([
        testPcrs1,
        testPcrs2,
      ]);

      manager.disablePolling();
    });

    it('retrieves the attestation docs from a hardcoded object and starts polling', async () => {
      let testAttestationData = { cage_123: testPcrs2 };

      let manager = new CagePcrManager(config(), testAttestationData);

      await manager.init();

      expect(await manager.get('cage_123')).to.deep.equal([testPcrs2]);

      manager.disablePolling();
    });

    it('retrieves missing in the background', async () => {
      let testProvider = () => {
        return new Promise((resolve) => {
          resolve([testPcrs1]);
        });
      };

      let testAttestationData = { cage_123: testProvider };

      let manager = new CagePcrManager(config(), testAttestationData);
      await manager.init();

      manager.clearStoredPcrs('cage_123');

      expect(await manager.get('cage')).to.deep.equal(undefined);

      //sleep 1 second
      await new Promise((r) => setTimeout(r, 1000));

      expect(await manager.get('cage')).to.deep.equal([testPcrs1]);

      manager.disablePolling();
    });
  });
});
