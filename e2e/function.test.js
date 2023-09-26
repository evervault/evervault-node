const { expect } = require('chai');
const axios = require('axios');
const Evervault = require('../lib');

describe('Functions', () => {
  const appUuid = process.env.EV_APP_UUID;
  const apiKey = process.env.EV_API_KEY;
  const functionName = process.env.EV_FUNCTION_NAME;

  let evervaultClient;

  beforeEach(() => {
    evervaultClient = new Evervault(appUuid, apiKey);
  });

  context('Function runs', () => {
    it('runs the function', async () => {
      const payload = {
        name: 'John Doe',
      };
      const encrypted = await evervaultClient.encrypt(payload);

      const functionResponse = await evervaultClient.run(
        functionName,
        encrypted
      );
      expect(functionResponse.status).to.equal('success');
      expect(functionResponse.result.name).to.equal('John Doe');
    });

    it('runs the function and returns the error object', async () => {
      const payload = {
        shouldError: true,
      };

      const functionResponse = await evervaultClient.run(functionName, payload);
      expect(functionResponse.status).to.equal('failure');
      expect(functionResponse.error.message).to.equal('Uh oh!');
    });

    it('runs the function with a run token', async () => {
      const payload = {
        name: 'John Doe',
      };
      const encrypted = await evervaultClient.encrypt(payload);
      const tokenResponse = await evervaultClient.createRunToken(
        functionName,
        encrypted
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const functionResponse = await axios.post(
        `https://api.evervault.io/functions/${functionName}/runs`,
        { payload: encrypted },
        {
          headers: {
            Authorization: `RunToken ${tokenResponse.token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      expect(functionResponse.status).to.equal('success');
      expect(functionResponse.data.result.name).to.equal('John Doe');
    });
  });
});
