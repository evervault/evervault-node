const crypto = require('crypto');
const ASN1 = require('uasn1');
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

/**
 * The seed parameter is optional according to the X9.62 standard
 * for DER encoding public keys
 * https://www.bsi.bund.de/SharedDocs/Downloads/EN/BSI/Publications/TechGuidelines/TR03111/BSI-TR-03111_V-2-0_pdf.pdf?__blob=publicationFile&v=1
 */
const buildEncoder = (curveName) => {
  const curveParams = curveConstants[curveName];
  return (decompressedKey) => {
    const hexEncodedKey = ASN1(
      '30',
      ASN1(
        '30',
        // 1.2.840.10045.2.1 ecPublicKey
        // (ANSI X9.62 public key type)
        ASN1('06', '2A 86 48 CE 3D 02 01'),
        ASN1(
          '30',
          // ECParameters Version
          ASN1.UInt('01'),
          ASN1(
            '30',
            // X9.62 Prime Field
            ASN1('06', '2A 86 48 CE 3D 01 01'),
            // curve p value
            ASN1.UInt(curveParams.p)
          ),
          curveParams.seed
            ? ASN1(
                '30',
                // curve a value
                ASN1('04', curveParams.a),
                // curve b value
                ASN1('04', curveParams.b),
                // curve seed value
                ASN1.BitStr(curveParams.seed)
              )
            : ASN1(
                '30',
                // curve a value
                ASN1('04', curveParams.a),
                // curve b value
                ASN1('04', curveParams.b)
              ),
          // curve generate point in decompressed form
          ASN1('04', curveParams.generator),
          // curve n value
          ASN1.UInt(curveParams.n),
          // curve h value
          ASN1.UInt(curveParams.h)
        )
      ),
      // decompressed public key
      ASN1.BitStr(decompressedKey)
    );

    return Buffer.from(hexEncodedKey, 'hex');
  };
};

module.exports = {
  encodePublicKey: createCurve(),
};
