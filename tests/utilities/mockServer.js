const http = require('http');

const testCageKey = 'im-the-function-key';
const testEcdhCageKey = 'AjLUS3L3KagQud+/3R1TnGQ2XSF763wFO9cd/6XgaW86';

const createServer = () => {
  const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/cages/key') {
      res.writeHead(200, { 'Content-Type': 'application/json' });

      const jsonResponse = {
        key: testCageKey,
        ecdhKey: testEcdhCageKey,
      };
      res.end(JSON.stringify(jsonResponse));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not Found' }));
    }
  });

  server.listen(0, () => {
    const port = server.address().port;
    console.log(`Server is listening on port ${port}`);
  });

  return server;
};

module.exports = {
  createServer,
};
