const crypto = require('crypto');
const ASN1 = require('asn1js');
const curveConstants = require('./constants');

/**
 * Given an EC curve name and its constants, generate a DER encoder for its compressed public keys
 * @param curveName
 * @param curveValues
 * @returns Function(compressedPubKey): base64EncodedString
 */
const createCurve = () => {
  return (curveName, compressedPubKey) => {
    const asn1Encoder = buildEncoder(curveName);
    const decompressed = crypto.ECDH.convertKey(
      compressedPubKey,
      curveName,
      'base64',
      'hex',
      'uncompressed'
    );
    return asn1Encoder(decompressed);
  };
};

const PUBLIC_KEY_TYPE = '1.2.840.10045.2.1';
const PRIME_FIELD = '1.2.840.10045.1.1';
const VERSION = '01';

// Constructing the Public Key Format (SPKI) as per the X9.62 standard
// by following the definition on page 30 of:
// https://www.bsi.bund.de/SharedDocs/Downloads/EN/BSI/Publications/TechGuidelines/TR03111/BSI-TR-03111_V-2-0_pdf.pdf?__blob=publicationFile&v=1
//
// The seed parameter is optional.
const FieldId = (curveParams) => {
  return new ASN1.Sequence({
    name: 'fieldID',
    value: [
      new ASN1.ObjectIdentifier({
        name: 'fieldType',
        value: PRIME_FIELD,
      }),
      new ASN1.Integer({
        name: 'parameters',
        valueHex: new Uint8Array(
          curveParams.p.match(/../g).map((h) => parseInt(h, 16))
        ).buffer
      }),
    ],
  });
};

const Curve = (curveParams) => {
  return new ASN1.Sequence({
    name: 'curve',
    value: [
      new ASN1.OctetString({
        name: 'a',
        valueHex: new Uint8Array(
          curveParams.a.match(/../g).map((h) => parseInt(h, 16))
        ).buffer,
      }),
      new ASN1.OctetString({
        name: 'b',
        valueHex: new Uint8Array(
          curveParams.b.match(/../g).map((h) => parseInt(h, 16))
        ).buffer,
      }),
      new ASN1.BitString({
        optional: true,
        name: 'seed',
        valueHex: curveParams.seed ? new Uint8Array(
          curveParams.seed.match(/../g).map((h) => parseInt(h, 16))
        ).buffer : curveParams.seed,
      }),
    ]
  });
};

const ECParameters = (curveParams) => {
  return new ASN1.Sequence({
    name: 'ecParameters',
    value: [
      new ASN1.Integer({
        name: 'version',
        valueHex: new Uint8Array(
          VERSION.match(/../g).map((h) => parseInt(h, 16))
        ).buffer,
      }),
      FieldId(curveParams),
      Curve(curveParams),
      new ASN1.OctetString({
        name: 'base',
        valueHex: new Uint8Array(
          curveParams.generator.match(/../g).map((h) => parseInt(h, 16))
        ).buffer,
      }),
      new ASN1.Integer({
        name: 'order',
        valueHex: new Uint8Array(
          curveParams.n.match(/../g).map((h) => parseInt(h, 16))
        ).buffer,
      }),
      new ASN1.Integer({
        optional: true,
        name: 'cofactor',
        valueHex: new Uint8Array(
          curveParams.h.match(/../g).map((h) => parseInt(h, 16))
        ).buffer,
      }),
    ],
  });
};

const AlgorithmIdentifier = (curveParams) => {
  return new ASN1.Sequence({
    name: 'algorithm',
    value: [
      new ASN1.ObjectIdentifier({
        name: 'algorithm',
        value: PUBLIC_KEY_TYPE,
      }),
      ECParameters(curveParams),
    ],
  });
};

const SubjectPublicKeyInfo = (curveParams, decompressedKey) => {
  return new ASN1.Sequence({
    name: 'SubjectPublicKeyInfo',
    value: [
      AlgorithmIdentifier(curveParams),
      new ASN1.BitString({
        name: 'subjectPublicKey',
        valueHex: new Uint8Array(
          decompressedKey.match(/../g).map((h) => parseInt(h, 16))
        ).buffer,
      }),
    ],
  });
}

const buildEncoder = (curveName) => {
  const curveParams = curveConstants[curveName];
  return (decompressedKey) => {
    const spki = SubjectPublicKeyInfo(curveParams, decompressedKey);
    console.log(spki.toString('hex'))
    return Buffer.from(spki.toString('hex'), 'hex');
  };
};

module.exports = {
  encodePublicKey: createCurve(),
};
