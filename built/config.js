const API_URL = 'https://api.evervault.com';
module.exports = (apikey) => ({
    http: {
        baseUrl: API_URL,
        headers: {
            'API-KEY': apikey,
        },
        responseType: 'json',
    },
    encryption: {
        cipherAlgorithm: 'aes-256-gcm',
        keyLength: 32,
        authTagLength: 16,
        publicHash: 'sha256',
        header: {
            iss: 'evervault',
            version: 1,
        },
    },
});
