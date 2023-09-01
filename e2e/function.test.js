const { expect } = require('chai');
const axios = require('axios');
const Evervault = require('../lib');

describe("Encrypt and Decrypt", () => {
    const appUuid = process.env.EV_APP_UUID;
    const apiKey = process.env.EV_API_KEY;
    const functionName = process.env.EV_FUNCTION_NAME;

    let evervaultClient;
    
    beforeEach(() => {
        evervaultClient = new Evervault(appUuid, apiKey);
    });

    context('Function runs', () => {
        it("runs the function", async () => {
            const payload = {"name": "test"};
            const encrypted = await evervaultClient.encrypt(payload);

            const functionResponse = await evervaultClient.run(functionName, encrypted)
            expect(functionResponse.result.message).to.equal("Hello from a Function! It seems you have 4 letters in your name");
        });

        it("runs the function async", async () => {
            const payload = {"name": "test"};
            const encrypted = await evervaultClient.encrypt(payload);

            const functionResponse = await evervaultClient.run(functionName, encrypted, { async: true });
            expect(functionResponse.length).to.equal(0)
        });

        it("runs the function witih a run token", async () => {
            const payload = {"name": "test"};
            const encrypted = await evervaultClient.encrypt(payload);
            const tokenResponse = await evervaultClient.createRunToken(functionName, encrypted);
            const functionResponse = await axios.post(
                `https://run.evervault.com/${functionName}`,
                { ...encrypted },
                {
                    headers: {
                        "Authorization": `Bearer ${tokenResponse.token}`,
                        "Content-Type": "application/json",
                    }
                }
            );
            expect(functionResponse.data.result.message).to.equal("Hello from a Function! It seems you have 4 letters in your name");
        });
    });
});
