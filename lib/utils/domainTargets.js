/**
 * Grouping of helpers and types to aid reasoning about destinations when intercepting outbound traffic.
 */

/**
 * Apply the matching logic based on the matcher type and specificity.
 * @param {string} givenValue
 * @param {import("./domainTargets").Matcher} matcher
 */
function applyMatch(givenValue, matcher) {
  if (matcher.specificity === 'absolute') {
    return givenValue === matcher.value;
  }
  if (matcher.type === 'host') {
    return givenValue.endsWith(matcher.value);
  }
  if (matcher.type === 'path') {
    return givenValue.startsWith(matcher.value);
  }
  return false;
}

/**
 * Apply a target matcher against the given host and path combination. If a path matcher is defined on the target, it will only match if *both* the host and path match.
 * @param {string} requestedHost
 * @param {string} requestedPath
 * @param {import('./domainTargets').Target} target
 */
function matchTarget(requestedHost, requestedPath, target) {
  if (target.path != null) {
    return (
      applyMatch(requestedHost, target.host) &&
      applyMatch(requestedPath, target.path)
    );
  }
  return applyMatch(requestedHost, target.host);
}

/**
 * Check if the given hostname includes a protocol prefix.
 * @param {string} val
 * @returns {boolean}
 */
function startsWithProto(val) {
  return val.startsWith('https://') || val.startsWith('http://');
}

/**
 * Create a matcher object from a hostname string. If the hostname begins with an asterisk, it will be treated as a wildcard matcher.
 * @param {string} host
 * @return {import('./domainTargets').Matcher}
 */
function buildHostMatcher(host) {
  const specificity = host.startsWith('*') ? 'wildcard' : 'absolute';
  const value = specificity === 'wildcard' ? host.slice(1) : host;
  return {
    type: 'host',
    specificity,
    value,
  };
}

/**
 * Create a matcher object from a path string. If the string ends with an asterisk, it will be treated as a wildcard matcher.
 * @param {string} path
 * @return {import('./domainTargets').Matcher}
 */
function buildPathMatcher(path) {
  const specificity = path.endsWith('*') ? 'wildcard' : 'absolute';
  const value = specificity === 'wildcard' ? path.slice(0, -1) : path;
  return {
    type: 'path',
    specificity,
    value,
  };
}

/**
 * Convert a user provided input into a target matcher, lightly validating the input in the process.
 * @param {unknown} rawInputValue
 * @returns {import("./domainTargets").Target | null}
 */
function importTarget(rawInputValue) {
  if (typeof rawInputValue !== 'string' || rawInputValue.length === 0) {
    return null;
  }

  // Targets are expected to be domains with optional paths.
  if (startsWithProto(rawInputValue)) {
    return null;
  }

  const startPathIndex = rawInputValue.indexOf('/');
  if (startPathIndex === -1) {
    return {
      rawValue: rawInputValue,
      host: buildHostMatcher(rawInputValue),
    };
  }

  const hostname = rawInputValue.slice(0, startPathIndex);
  const path = rawInputValue.slice(startPathIndex);

  return {
    rawValue: rawInputValue,
    host: buildHostMatcher(hostname),
    path: buildPathMatcher(path),
  };
}

module.exports = {
  importTarget,
  matchTarget,
};
