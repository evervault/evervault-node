const fs = require('fs');
const path = require('path');
const { expect } = require('chai');
const { attest } = require('../../lib/utils');
const { AttestationDoc, PcrManager } = require('../../lib/core');
const config = require('../../lib/config');
const sinon = require('sinon');
const {
  CageAttestationError,
  MalformedAttestationData,
} = require('../../lib/utils/errors');

/**
 * Note: these tests are time sensitive, so are expected to fail when used without libfaketime
 * To avoid false negatives, these tests will only run when the FAKETIME env var is set
 */
const fakeTimeTests =
  process.env.FAKETIME != null && attest.hasAttestationBindings()
    ? describe
    : describe.skip;

describe('attestGA', async () => {
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
      getAttestationDoc: sinon
        .stub()
        .resolves(JSON.parse(attestationDocResponse)),
    };

    afterEach(() => {
      httpStub.getAttestationDoc.resetHistory();
    });

    context('validateAttestationData', () => {
      it('Throws a MalformedAttestationData error if the data is not an object', () => {
        try {
          attest.validateAttestationData([]);
        } catch (err) {
          expect(err).to.be.instanceOf(MalformedAttestationData);
        }
      });

      it('Throws a MalformedAttestationData error if the data contains non-object values', () => {
        try {
          attest.validateAttestationData({ 'my-cage': true });
        } catch (err) {
          expect(err).to.be.instanceOf(MalformedAttestationData);
        }
      });

      it('Does not throw when the values in the object are themselves objects', () => {
        const result = attest.validateAttestationData({ 'my-cage': {} });
        expect(result).to.be.undefined;
      });
    });

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
        let manager = new PcrManager(config(), testAttestationData);
        await manager.init();

        const result = await attest.attestCageConnection(
          `${cageName}.${appUuid}.${hostname}`,
          derCert,
          manager,
          cache
        );
        expect(result).to.be.undefined;
        cache.disablePolling();
        manager.disablePolling();
      });
    });

    context(
      'given a valid cert and PCRs with an alternative hostname',
      async () => {
        it('calls the cage at the alternative hostname, and  successfully attests the connection', async () => {
          let cache = new AttestationDoc(
            config(),
            httpStub,
            [cageName],
            appUuid,
            'enclave.evervault.com'
          );
          await cache.init();
          let testProvider = () => {
            return new Promise((resolve) => {
              resolve([validPCRs]);
            });
          };

          let testAttestationData = { [cageName]: testProvider };
          let manager = new PcrManager(config(), testAttestationData);
          await manager.init();

          const result = await attest.attestCageConnection(
            `${cageName}.${appUuid}.${hostname}`,
            derCert,
            manager,
            cache
          );
          expect(result).to.be.undefined;
          expect(httpStub.getAttestationDoc).to.have.been.calledWith(
            cageName,
            appUuid.replace('_', '-'),
            'enclave.evervault.com'
          );
          cache.disablePolling();
          manager.disablePolling();
        });
      }
    );

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
        let manager = new PcrManager(config(), testAttestationData);
        await manager.init();

        const result = await attest.attestCageConnection(
          `${cageName}.${appUuid}.${hostname}`,
          derCert,
          manager,
          cache
        );
        expect(result).to.be.undefined;
        cache.disablePolling();
        manager.disablePolling();
      });
    });

    context('given a valid cert and some PCRs', () => {
      it('successfully attests the connection', async () => {
        let cache = new AttestationDoc(config(), httpStub, [cageName], appUuid);
        await cache.init();

        let testAttestationData = { [cageName]: validPCRs };
        let manager = new PcrManager(config(), testAttestationData);
        await manager.init();

        const result = await attest.attestCageConnection(
          `${cageName}.${appUuid}.${hostname}`,
          derCert,
          manager,
          cache
        );
        expect(result).to.be.undefined;
        cache.disablePolling();
        manager.disablePolling();
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
          let manager = new PcrManager(config(), testAttestationData);
          await manager.init();

          await attest.attestCageConnection(
            `${cageName}.${appUuid}.${hostname}`,
            derCert,
            manager,
            cache
          );
          cache.disablePolling();
          manager.disablePolling();
        } catch (err) {
          expect(err).to.be.instanceOf(CageAttestationError);
        }
      });
    });
  });
});
