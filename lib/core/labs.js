module.exports = ({ http, crypto, run }) => {
  return {
    fetch: async (url, options) => {
      const { body } = await http.runFunction('proxy-cage', {
        url,
        options,
      });

      return body.result;
    },
  };
};
