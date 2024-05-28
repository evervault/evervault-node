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

const hexStringToUint8Array = (hexString) => {
  return hexString.match(/../g).map((h) => parseInt(h, 16));
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
        // Theres a specific rule this library doesn't seem to implement for Integer:
        // If the first byte is 0x80 or greater, the number is considered negative so we add a '00' prefix if the 0x80 bit is set
        // We need to manually add the 0x00 prefix to the value to make the library work as the first byte of 'p' is > 0x80
        valueHex: new Uint8Array([0, ...hexStringToUint8Array(curveParams.p)])
          .buffer,
      }),
    ],
  });
};

const Curve = (curveParams) => {
  return new ASN1.Sequence({
    name: 'curve',
    value: curveParams.seed
      ? [
          new ASN1.OctetString({
            name: 'a',
            valueHex: new Uint8Array(hexStringToUint8Array(curveParams.a))
              .buffer,
          }),
          new ASN1.OctetString({
            name: 'b',
            valueHex: new Uint8Array(hexStringToUint8Array(curveParams.b))
              .buffer,
          }),
          new ASN1.BitString({
            optional: true,
            name: 'seed',
            valueHex: curveParams.seed
              ? new Uint8Array(hexStringToUint8Array(curveParams.seed)).buffer
              : curveParams.seed,
          }),
        ]
      : [
          new ASN1.OctetString({
            name: 'a',
            valueHex: new Uint8Array(hexStringToUint8Array(curveParams.a))
              .buffer,
          }),
          new ASN1.OctetString({
            name: 'b',
            valueHex: new Uint8Array(hexStringToUint8Array(curveParams.b))
              .buffer,
          }),
        ],
  });
};

const ECParameters = (curveParams) => {
  return new ASN1.Sequence({
    name: 'ecParameters',
    value: [
      new ASN1.Integer({
        name: 'version',
        valueHex: new Uint8Array(hexStringToUint8Array(VERSION)).buffer,
      }),
      FieldId(curveParams),
      Curve(curveParams),
      new ASN1.OctetString({
        name: 'base',
        valueHex: new Uint8Array(hexStringToUint8Array(curveParams.generator))
          .buffer,
      }),
      new ASN1.Integer({
        name: 'order',
        // Theres a specific rule this library doesn't seem to implement for Integer:
        // If the first byte is 0x80 or greater, the number is considered negative so we add a '00' prefix if the 0x80 bit is set
        // We need to manually add the 0x00 prefix to the value to make the library work as the first byte of 'n' is > 0x80
        valueHex: new Uint8Array([0, ...hexStringToUint8Array(curveParams.n)])
          .buffer,
      }),
      new ASN1.Integer({
        optional: true,
        name: 'cofactor',
        valueHex: new Uint8Array(hexStringToUint8Array(curveParams.h)).buffer,
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
        valueHex: new Uint8Array(hexStringToUint8Array(decompressedKey)).buffer,
      }),
    ],
  });
};

const buildEncoder = (curveName) => {
  const curveParams = curveConstants[curveName];
  return (decompressedKey) => {
    const spki = SubjectPublicKeyInfo(curveParams, decompressedKey);
    return Buffer.from(spki.toString('hex'), 'hex');
  };
};

module.exports = {
  encodePublicKey: createCurve(),
};
