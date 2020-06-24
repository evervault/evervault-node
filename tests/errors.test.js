const { expect } = require('chai');
const { errors } = require('../lib/utils');
const { ApiKeyError, RequestError, AccountError } = errors;

const createErrorMapFn = (status, body) => () =>
  errors.mapApiResponseToError({ statusCode: status, body });

describe('Errors', () => {
  describe('mapApiResponseToError', () => {
    context('Received a 401', () => {
      it('Returns an ApiKeyError', () => {
        expect(
          errors.mapApiResponseToError({ statusCode: 401 })
        ).to.be.instanceOf(ApiKeyError);
      });
    });

    context('Received a 404', () => {
      it('Returns a RequestError', () => {
        expect(
          errors.mapApiResponseToError({ statusCode: 404 })
        ).to.be.instanceOf(RequestError);
      });
    });

    context('Received a 423', () => {
      it('Returns an AccountError', () => {
        expect(
          errors.mapApiResponseToError({ statusCode: 423, body: {} })
        ).to.be.instanceOf(AccountError);
      });
    });

    context('Received a 424', () => {
      it('Returns an AccountError', () => {
        expect(
          errors.mapApiResponseToError({ statusCode: 424, body: {} })
        ).to.be.instanceOf(AccountError);
      });
    });
  });
});
