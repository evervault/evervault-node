const racePromises = (...promises) => {
  return new Promise((resolve, reject) => {
    promises.forEach((promise) => promise.then(resolve).catch(reject));
  });
};

const timeoutPromise = (cb, timeout) => {
  const params = [];
  const timeoutRef = setTimeout(
    ([resolve, reject]) => {
      try {
        const cbResult = cb();
        if (cbResult.then) {
          cbResult.then(resolve).catch(reject);
        } else {
          resolve(cbResult);
        }
      } catch (err) {
        reject(err);
      }
    },
    timeout,
    params
  );
  const promise = new Promise((resolve, reject) => {
    params.push(resolve);
    params.push(reject);
  });
  return {
    promise,
    timeout: timeoutRef,
  };
};

module.exports = {
  timeoutPromise,
  racePromises,
};
