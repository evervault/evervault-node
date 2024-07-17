const http = require('http');

const createServer = (hander) => {
  const server = http.createServer(hander);

  server.listen(0, () => {
    const port = server.address().port;
    console.log(`Server is listening on port ${port}`);
  });

  return server;
};

module.exports = {
  createServer,
};
