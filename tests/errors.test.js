const { expect } = require('chai');
const { errors } = require('../lib/utils');
const { ApiKeyError, RequestError, AccountError } = errors;

describe('Errors', () => {
  describe('mapResponseCodeToError', () => {
    context('Received a 401', () => {
      it('Returns an ApiKeyError', () => {
        expect(
          errors.mapResponseCodeToError({ statusCode: 401 })
        ).to.be.instanceOf(ApiKeyError);
      });
    });

    context('Received a 404', () => {
      it('Returns a RequestError', () => {
        expect(
          errors.mapResponseCodeToError({ statusCode: 404 })
        ).to.be.instanceOf(RequestError);
      });
    });

    context('Received a 423', () => {
      it('Returns an AccountError', () => {
        expect(
          errors.mapResponseCodeToError({ statusCode: 423, body: {} })
        ).to.be.instanceOf(AccountError);
      });
    });

    context('Received a 424', () => {
      it('Returns an AccountError', () => {
        expect(
          errors.mapResponseCodeToError({ statusCode: 424, body: {} })
        ).to.be.instanceOf(AccountError);
      });
    });
  });
});
