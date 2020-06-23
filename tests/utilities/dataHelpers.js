const parseBase64ToJson = (data) =>
  JSON.parse(base64ToBuffer(data).toString('utf8'));

const base64ToBuffer = (data) => Buffer.from(data, 'base64');

const parseEncryptedData = (data) => {
  const [header, body, uuid] = data.split('.');
  return { header, body, uuid };
};

module.exports = {
  parseBase64ToJson,
  base64ToBuffer,
  parseEncryptedData,
};
