const fs = require('fs');
const path = require('path');
const { expect } = require('chai');
const { cageAttest } = require('../../lib/utils');
const { AttestationDoc, CagePcrManager } = require('../../lib/core');
const config = require('../../lib/config');
const sinon = require('sinon');
const { CageAttestationError } = require('../../lib/utils/errors');

/**
 * Note: these tests are time sensitive, so are expected to fail when used without libfaketime
 * To avoid false negatives, these tests will only run when the FAKETIME env var is set
 */
const fakeTimeTests =
  process.env.FAKETIME != null && cageAttest.hasAttestationBindings()
    ? describe
    : describe.skip;

describe('cageAttestGA', async () => {
  fakeTimeTests('attestCageConnectionGA', async () => {
    const cageName = 'a-test-of-attest';
    const appUuid = 'app_452e33b20b42';
    const hostname = 'cages.evervault.com';
    const validPCRs = {
      pcr0: '000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
      pcr1: '000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
      pcr2: '000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
      pcr8: '000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
    };
    const invalidPCR = {
      pcr8: 'Invalid0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
    };
    const derCert = fs.readFileSync(
      path.resolve(__dirname, '../utilities/cage-certificate.crt')
    );

    const attestationDocResponse = fs.readFileSync(
      path.resolve(__dirname, '../utilities/attestation-doc.json')
    );

    let httpStub = {
      getCageAttestationDoc: sinon
        .stub()
        .resolves(JSON.parse(attestationDocResponse)),
    };

    context('given a valid cert and PCRs', async () => {
      it('successfully attests the connection', async () => {
        let cache = new AttestationDoc(config(), httpStub, [cageName], appUuid);
        await cache.init();
        let testProvider = () => {
          return new Promise((resolve) => {
            resolve([validPCRs]);
          });
        };

        let testAttestationData = { [cageName]: testProvider };
        let manager = new CagePcrManager(config(), testAttestationData);
        await manager.init();

        const result = await cageAttest.attestCageConnection(
          `${cageName}.${appUuid}.${hostname}`,
          derCert,
          manager,
          cache
        );
        expect(result).to.be.undefined;
        cache.disablePolling();
      });
    });

    context('given a key that doesnt exist in the cache', async () => {
      it('reloads doc for given cage and tries again', async () => {
        let cache = new AttestationDoc(config(), httpStub, [cageName], appUuid);
        await cache.init();

        let testProvider = () => {
          return new Promise((resolve) => {
            resolve([validPCRs]);
          });
        };

        let testAttestationData = { [cageName]: testProvider };
        let manager = new CagePcrManager(config(), testAttestationData);
        await manager.init();

        const result = await cageAttest.attestCageConnection(
          `otherCageName.${appUuid}.${hostname}`,
          derCert,
          manager,
          cache
        );
        expect(result).to.be.undefined;
        cache.disablePolling();
      });
    });

    context('given a valid cert and no PCRs', async () => {
      it('successfully attests the connection', async () => {
        let cache = new AttestationDoc(config(), httpStub, [cageName], appUuid);
        await cache.init();
        let testProvider = () => {
          return new Promise((resolve) => {
            resolve([validPCRs]);
          });
        };

        let testAttestationData = { [cageName]: testProvider };
        let manager = new CagePcrManager(config(), testAttestationData);
        await manager.init();

        const result = await cageAttest.attestCageConnection(
          `${cageName}.${appUuid}.${hostname}`,
          derCert,
          manager,
          cache
        );
        expect(result).to.be.undefined;
        cache.disablePolling();
      });
    });

    context('given a valid cert and some PCRs', () => {
      it('successfully attests the connection', async () => {
        let cache = new AttestationDoc(config(), httpStub, [cageName], appUuid);
        await cache.init();

        let testAttestationData = { [cageName]: validPCRs };
        let manager = new CagePcrManager(config(), testAttestationData);
        await manager.init();

        const result = await cageAttest.attestCageConnection(
          `${cageName}.${appUuid}.${hostname}`,
          derCert,
          manager,
          cache
        );
        expect(result).to.be.undefined;
        cache.disablePolling();
      });
    });

    context('given a valid cert with incorrect PCRs', () => {
      it('rejects the connection with an attestation error', async () => {
        try {
          let cache = new AttestationDoc(
            config(),
            httpStub,
            [cageName],
            appUuid
          );
          await cache.init();
          let testAttestationData = { [cageName]: invalidPCR };
          let manager = new CagePcrManager(config(), testAttestationData);

          await cageAttest.attestCageConnection(
            `${cageName}.${appUuid}.${hostname}`,
            derCert,
            manager,
            cache
          );
          cache.disablePolling();
        } catch (err) {
          expect(err).to.be.instanceOf(CageAttestationError);
        }
      });
    });
  });
});
