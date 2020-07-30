const ev = require('.');

const e = new ev('NQ==:2TTzCdRF8uEPxbMYoD/SKGoTblS0LawKE/vGtV05W1E=');

(async () => {
    const r = await e.encrypt({
        name: "Shane"
    });

    console.log(r);
})()