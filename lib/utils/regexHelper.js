function buildDomainRegexFromPattern(domain) {
  const regex = domain
    // Replace globstars with their new equivalent
    .replace(/\*\*+\./g, '*')
    // Escape dots
    .replace(/\./g, '\\.')
    // Turn stars into regexes
    .replace(/\*+/g, '.*')
    // Convert *domain patterns to match subdomains and the domain itself
    .replace(/(\.\*)([^\\*.])/g, '$1(^|\\.)$2');
  return new RegExp(`^${regex}$`, 'i');
}

module.exports = {
  buildDomainRegexFromPattern,
};
