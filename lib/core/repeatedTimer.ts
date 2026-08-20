import { InvalidInterval } from '../utils/errors';

export default (
  defaultInterval: number | string,
  cb: () => Promise<void> | void
) => {
  const parsedInterval =
    typeof defaultInterval === 'string'
      ? parseFloat(defaultInterval)
      : defaultInterval;
  if (Number.isNaN(parsedInterval)) {
    throw new InvalidInterval(`Expected number, received ${parsedInterval}`);
  }
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

  const updateInterval = (newInterval: number) => {
    if (interval !== newInterval) {
      interval = newInterval;
      stop();
      currentIntervalId = createInterval();
    }
  };

  const getInterval = () => interval;

  const stop = () => {
    if (currentIntervalId) clearInterval(currentIntervalId);
    currentIntervalId = null;
  };

  const isRunning = () => currentIntervalId !== null;

  /* Initialization */
  let interval: number = parsedInterval;
  let currentIntervalId: NodeJS.Timeout | null = null;
  start();

  return {
    start,
    stop,
    isRunning,
    getInterval,
    updateInterval,
  };
};
