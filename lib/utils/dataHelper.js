const Big = require('big.js');

const VERSIONS_TO_ECDH_CURVES = {
  T1JL: 'prime256v1',
  RFVC: 'secp256k1',
  Tk9D: 'prime256v1',
};

const parseDecryptedDataToDatatype = (datatype, value) => {
  try {
    if (datatype.toLowerCase() === 'number') {
      return Number(value);
    } else if (datatype.toLowerCase() === 'bignumber') {
      return Big(value);
    } else if (datatype.toLowerCase() === 'boolean') {
      return Boolean(value);
    } else {
      return JSON.parse(value);
    }
  } catch (_) {
    return value;
  }
};

module.exports = {
  VERSIONS_TO_ECDH_CURVES,
  parseDecryptedDataToDatatype,
};
