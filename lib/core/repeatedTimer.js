module.exports = (defaultInterval, cb) => {
  const createInterval = () => {
    const initializedInterval = setInterval(async () => {
      try {
        await cb();
      } catch (e) {
        console.error(`EVERVAULT :: An error occurred while polling (${e})`);
      }
    }, interval * 1000);
    initializedInterval.unref();
    return initializedInterval;
  };

  const start = () => {
    if (!isRunning()) {
      currentIntervalId = createInterval();
    }
  };

  const updateInterval = (newInterval) => {
    if (interval !== newInterval) {
      interval = newInterval;
      stop();
      currentIntervalId = createInterval();
    }
  };

  const getInterval = () => interval;

  const stop = () => {
    clearInterval(currentIntervalId);
    currentIntervalId = null;
  };

  const isRunning = () => currentIntervalId !== null;

  /* Initialization */
  let interval = defaultInterval;
  let currentIntervalId = null;
  start();

  return {
    start,
    stop,
    isRunning,
    getInterval,
    updateInterval,
  };
};
