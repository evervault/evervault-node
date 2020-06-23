const parseBase64ToJson = (data) =>
  JSON.parse(base64ToBuffer(data).toString('utf8'));

const base64ToBuffer = (data) => Buffer.from(data, 'base64');

module.exports = {
  parseBase64ToJson,
  base64ToBuffer,
};
