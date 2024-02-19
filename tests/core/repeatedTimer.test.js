const { expect } = require('chai');
const Sinon = require('sinon');

const { InvalidInterval } = require('../../lib/utils/errors');
const RepeatedTimer = require('../../lib/core/repeatedTimer');

describe('RepeatedTimer Module', () => {
  it('Rejects when given a non-numeric value', () => {
    const stub = Sinon.stub();
    try {
      RepeatedTimer(undefined, stub);
    } catch (err) {
      expect(err).to.be.instanceOf(InvalidInterval);
      expect(stub).to.not.have.been.called;
    }
  });

  it('It polls at regular interval', (done) => {
    let counter = 0;
    const interval = 0.05;
    const callback = () => {
      counter++;
    };

    const repeatedTimer = RepeatedTimer(interval, callback);

    setTimeout(() => {
      repeatedTimer.stop();
      expect(counter).to.be.equal(3);
      done();
    }, 180);
  });

  it('It updates poll interval if updatePollInterval() is called', (done) => {
    let counter = 0;
    const interval = 0.025;
    const callback = () => {
      counter++;
    };

    const repeatedTimer = RepeatedTimer(interval, callback);

    setTimeout(() => {
      repeatedTimer.updateInterval(0.05);
      setTimeout(() => {
        repeatedTimer.stop();
        expect(counter).to.be.equal(4);
        done();
      }, 120);
    }, 60);
  });

  it('It stops polling when stop() is called', (done) => {
    let counter = 0;
    const interval = 0.05;
    const callback = () => {
      counter++;
    };

    const repeatedTimer = RepeatedTimer(interval, callback);

    setTimeout(() => {
      repeatedTimer.stop();
      setTimeout(() => {
        expect(counter).to.be.equal(1);
        done();
      }, 100);
    }, 75);
  });

  it('It silently ignore errors', (done) => {
    const interval = 0.05;
    const callback = () => {
      throw new Error('An error that should be ignored');
    };

    const repeatedTimer = RepeatedTimer(interval, callback);

    setTimeout(() => {
      repeatedTimer.stop();
      done();
    }, 120);
  });
});
