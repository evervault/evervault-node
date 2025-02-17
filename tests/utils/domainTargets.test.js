const { expect } = require('chai');

const { domainTargets } = require('../../lib/utils');

describe('domainTargets', () => {
  context('importTarget', () => {
    context('Absolute domain correctly formatted, no path', () => {
      it('imports the domain correctly', () => {
        const result = domainTargets.importTarget('google.com');
        expect(result).to.not.be.null;
        expect(result.rawValue).to.equal('google.com');
        expect(result.host.value).to.equal('google.com');
        expect(result.host.specificity).to.equal('absolute');
        expect(result.path).to.be.undefined;
      });
    });

    context('Absolute domain and path', () => {
      it('imports the domain and path correctly', () => {
        const result = domainTargets.importTarget('google.com/users');
        expect(result).to.not.be.null;
        expect(result.rawValue).to.equal('google.com/users');
        expect(result.host.value).to.equal('google.com');
        expect(result.host.specificity).to.equal('absolute');
        expect(result.path).to.not.be.undefined;
        expect(result.path.value).to.equal('/users');
        expect(result.path.specificity).to.equal('absolute');
      });
    });

    context('Wildcard domain, absolute path', () => {
      it('imports the domain and path correctly', () => {
        const result = domainTargets.importTarget('*.google.com/users');
        expect(result).to.not.be.null;
        expect(result.rawValue).to.equal('*.google.com/users');
        expect(result.host.value).to.equal('.google.com');
        expect(result.host.specificity).to.equal('wildcard');
        expect(result.path).to.not.be.undefined;
        expect(result.path.value).to.equal('/users');
        expect(result.path.specificity).to.equal('absolute');
      });
    });

    context('Wildcard domain, wildcard path', () => {
      it('imports the domain and path correctly', () => {
        const result = domainTargets.importTarget('*.google.com/users/*');
        expect(result).to.not.be.null;
        expect(result.rawValue).to.equal('*.google.com/users/*');
        expect(result.host.value).to.equal('.google.com');
        expect(result.host.specificity).to.equal('wildcard');
        expect(result.path).to.not.be.undefined;
        expect(result.path.value).to.equal('/users/');
        expect(result.path.specificity).to.equal('wildcard');
      });
    });

    context('Absolute domain, wildcard path', () => {
      it('imports the domain and path correctly', () => {
        const result = domainTargets.importTarget('google.com/users/*');
        expect(result).to.not.be.null;
        expect(result.rawValue).to.equal('google.com/users/*');
        expect(result.host.value).to.equal('google.com');
        expect(result.host.specificity).to.equal('absolute');
        expect(result.path).to.not.be.undefined;
        expect(result.path.value).to.equal('/users/');
        expect(result.path.specificity).to.equal('wildcard');
      });
    });

    context('Invalid domain with leading protocol', () => {
      it('Ignores the domain', () => {
        const result = domainTargets.importTarget('https://google.com/users/*');
        expect(result).to.be.null;
      });
    });

    context('Invalid domain type', () => {
      it('Ignores the domain', () => {
        const result = domainTargets.importTarget(false);
        expect(result).to.be.null;
      });
    });
  });

  context('matchTarget', () => {
    context('absolute domain matching input', () => {
      it('returns true', () => {
        const target = domainTargets.importTarget('google.com');
        const result = domainTargets.matchTarget(
          'google.com',
          '/users',
          target
        );
        expect(result).to.be.true;
      });
    });

    context('absolute domain not matching input', () => {
      it('returns false', () => {
        const target = domainTargets.importTarget('google.com');
        const result = domainTargets.matchTarget('api.com', '/users', target);
        expect(result).to.be.false;
      });
    });

    context('wildcard domain matching input', () => {
      it('returns true', () => {
        const target = domainTargets.importTarget('*.google.com');
        const result = domainTargets.matchTarget(
          'api.google.com',
          '/users',
          target
        );
        expect(result).to.be.true;
      });
    });

    context('wildcard domain not matching input', () => {
      it('returns false', () => {
        const target = domainTargets.importTarget('*.google.com');
        const result = domainTargets.matchTarget(
          'api.somewhere.com',
          '/users',
          target
        );
        expect(result).to.be.false;
      });
    });

    context('absolute domain and path matching input', () => {
      it('returns true', () => {
        const target = domainTargets.importTarget('google.com/users/foo');
        const result = domainTargets.matchTarget(
          'google.com',
          '/users/foo',
          target
        );
        expect(result).to.be.true;
      });
    });

    context('absolute domain and path not matching input', () => {
      it('returns true', () => {
        const target = domainTargets.importTarget('google.com/users/foo');
        const result = domainTargets.matchTarget(
          'google.com',
          '/users',
          target
        );
        expect(result).to.be.false;
      });
    });

    context('absolute domain and wildcard path matching input', () => {
      it('returns true', () => {
        const target = domainTargets.importTarget('google.com/users/*');
        const result = domainTargets.matchTarget(
          'google.com',
          '/users/foo',
          target
        );
        expect(result).to.be.true;
      });
    });

    context('absolute domain and wildcard path not matching input', () => {
      it('returns true', () => {
        const target = domainTargets.importTarget('google.com/users/*');
        const result = domainTargets.matchTarget(
          'google.com',
          '/settings',
          target
        );
        expect(result).to.be.false;
      });
    });

    context('wildcard domain and wildcard path matching input', () => {
      it('returns true', () => {
        const target = domainTargets.importTarget('*.google.com/users/*');
        const result = domainTargets.matchTarget(
          'api.google.com',
          '/users/foo',
          target
        );
        expect(result).to.be.true;
      });
    });

    context('wildcard domain and wildcard path not matching input', () => {
      it('returns true', () => {
        const target = domainTargets.importTarget('*.google.com/users/*');
        const result = domainTargets.matchTarget(
          'api.somewhere.com',
          '/settings',
          target
        );
        expect(result).to.be.false;
      });
    });
  });
});
