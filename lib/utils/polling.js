const pollRelayOutboundConfig = async (pollInterval, cb, debugRequests) => {
  // setInterval always waits for the delay before firing the first time, but we want to do an initial poll right away
  try {
    await cb(debugRequests);
  } catch (_e) {
    // catch initial error so the interval starts
    console.error(
      'EVERVAULT :: An error occurred while attempting to refresh the outbound relay config'
    );
  }
  return setInterval(
    async (debugRequests) => await cb(debugRequests),
    pollInterval
  );
};

module.exports = {
  pollRelayOutboundConfig,
};
