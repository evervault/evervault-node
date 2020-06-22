const axios = require('axios');

module.exports = (config) => {
  const axiosClient = axios.create(config);

  const getCageKey = () =>
    axiosClient.get('/cages/key').then((response) => response.data);
  const runCage = (cageName, payload) =>
    axiosClient.post(`/cages/${cageName}`, {
      data: payload,
    });

  return { getCageKey, runCage };
};
