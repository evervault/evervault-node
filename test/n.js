const ev = require("../lib");
const e = new ev(
  "MzU1:3wdRQcqLQ0GrOeu8o9rKukGdxIeFNgvDkMrIZIcwP8yI3xDCr2Zeu3BwBYEMATxSL",
  {
    relay: true,
  }
);

const got = require("got");

(async () => {
  const r = await got.post("https://httpbin.org/post", {
    json: {
      hello: "world",
    },
  });

  console.log(r);
})();
