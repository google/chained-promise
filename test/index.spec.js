"use strict";

import chai from "chai";
import ChainedPromise from "../src/index";

chai.should();
var assert = chai.assert;

var nullPromise = new Promise((resolver, rejecter) => {
});

describe("ChainedPromise", function () {
  describe("forEach", function () {
    it("runs function on each value", function (done) {
      var dataCollected = [];
      var thirdPromise = Promise.resolve({
        data: 3,
        next: {
          then: (resolver) => {
            dataCollected.should.eql([1, 2, 3]);
            done();
          }
        }
      });
      var secondPromise = Promise.resolve({
        data: 2,
        next: thirdPromise
      });
      var testChainedPromise = new ChainedPromise((resolver, rejecter) => {
        resolver({
          data: 1,
          next: secondPromise
        });
      });
      testChainedPromise.forEach((v) => {
        dataCollected.push(v.data);
      }).catch((err) => console.error(err.stack, err));
    });
  });
});
