const fs = require('fs');
const path = require('path');
const { expect } = require('chai');
const { cageAttest, errors } = require('../../lib/utils');

/**
 * Note: these tests are time sensitive, so are expected to fail when used without libfaketime
 * To avoid false negatives, these tests will only run when the FAKETIME env var is set
 */
const fakeTimeTests =
  process.env.FAKETIME != null && cageAttest.hasAttestationBindings()
    ? describe
    : describe.skip;

describe('cageAttest', () => {
  describe('parseCageNameFromHost', () => {
    const testCage = 'my-cage';
    const testApp = 'my-app';
    const hostname = 'cages.evervault.com';
    context('Request to base cage host name', () => {
      it('returns expected cage name', () => {
        const cageName = cageAttest.parseCageNameFromHost(
          `${testCage}.${testApp}.${hostname}`
        );
        expect(cageName).to.deep.equal(testCage);
      });
    });
    context('Request to cage nonce subdomain', () => {
      it('returns expected cage name', () => {
        const cageName = cageAttest.parseCageNameFromHost(
          `noncey.attest.${testCage}.${testApp}.${hostname}`
        );
        expect(cageName).to.deep.equal(testCage);
      });
    });
  });

  fakeTimeTests('attestCageConnection', () => {
    const cageName = 'a-test-of-attest';
    const appUuid = 'app_452e33b20b42';
    const hostname = 'cages.evervault.com';
    const validPCRs = {
      pcr0: 'd265a83faa7b4fa0d73b82b6d06253e894445922937d0ee5a74fe4891da9817611a71e71b98e5329232902de3cf419af',
      pcr1: 'bcdf05fefccaa8e55bf2c8d6dee9e79bbff31e34bf28a99aa19e6b29c37ee80b214a414b7607236edf26fcb78654e63f',
      pcr2: 'e4f634d24ad83b7f6e49fe283bafdb220f6252fb4a278a858e19d15b7cd0f263b9168ed0bacefb4444266df9f9a77f24',
      pcr8: '97c5395a83c0d6a04d53ff962663c714c178c24500bf97f78456ed3721d922cf3f940614da4bb90107c439bc4a1443ca',
    };
    const derCert = fs.readFileSync(
      path.resolve(
        __dirname,
        '../utilities/non-debug-cert-containing-attestation-document-18-1-23-der.crt'
      )
    );

    context('given a valid cert and PCRs', () => {
      it('successfully attests the connection', () => {
        const result = cageAttest.attestCageConnection(
          `${cageName}.${appUuid}.${hostname}`,
          {
            raw: derCert,
          },
          {
            [cageName]: validPCRs,
          }
        );
        expect(result).to.be.undefined;
      });
    });

    context('given a valid cert and no PCRs', () => {
      it('successfully attests the connection', () => {
        const result = cageAttest.attestCageConnection(
          `${cageName}.${appUuid}.${hostname}`,
          {
            raw: derCert,
          }
        );
        expect(result).to.be.undefined;
      });
    });

    context('given a valid cert and some PCRs', () => {
      it('successfully attests the connection', () => {
        const result = cageAttest.attestCageConnection(
          `${cageName}.${appUuid}.${hostname}`,
          {
            raw: derCert,
          },
          {
            [cageName]: {
              pcr8: validPCRs.pcr8,
            },
          }
        );
        expect(result).to.be.undefined;
      });
    });

    context('given a valid cert with incorrect PCRs', () => {
      it('rejects the connection with an attestation error', () => {
        try {
          const invalidPCRs = { ...validPCRs };
          invalidPCRs.pcr8 = validPCRs.pcr0;
          cageAttest.attestCageConnection(
            `${cageName}.${appUuid}.${hostname}`,
            {
              raw: derCert,
            },
            {
              [cageName]: invalidPCRs,
            }
          );
        } catch (err) {
          expect(err).to.be.instanceOf(errors.CageAttestationError);
        }
      });
    });
  });
});
