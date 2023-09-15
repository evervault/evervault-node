const fs = require('fs');
const path = require('path');
const { expect } = require('chai');
const { cageAttest } = require('../../lib/utils');
const { AttestationDoc } = require('../../lib/core');
const config = require('../../lib/config');
const sinon = require('sinon');

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
        const result = cageAttest.attestCageConnection(
          `${cageName}.${appUuid}.${hostname}`,
          derCert,
          {
            [cageName]: validPCRs,
          },
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
        const result = cageAttest.attestCageConnection(
          `${cageName}.${appUuid}.${hostname}`,
          derCert,
          {},
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
        const result = cageAttest.attestCageConnection(
          `${cageName}.${appUuid}.${hostname}`,
          derCert,
          {
            [cageName]: {
              pcr8: validPCRs.pcr8,
            },
          },
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
          const invalidPCRs = { ...validPCRs };
          invalidPCRs.pcr8 = validPCRs.pcr0;
          cageAttest.attestCageConnection(
            `${cageName}.${appUuid}.${hostname}`,
            derCert,
            {
              [cageName]: invalidPCRs,
            },
            cache
          );
          cache.disablePolling();
        } catch (err) {
          expect(err).to.be.instanceOf(errors.CageAttestationError);
        }
      });
    });
  });
});
