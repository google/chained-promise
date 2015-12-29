"use strict";

import chai from "chai";
import "babel-polyfill";
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
            if (!resolver) {
              // Skip catch call.
              return;
            }
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
  describe("flatMap", function () {
    it("composes flat map functions", function (done) {
      let addOnePromise = function(v) {
        return Promise.resolve(Object.assign(v, {data: v.data + 1}));
      };
      let doublePromise = function(v) {
        return Promise.resolve(Object.assign(v, {data: v.data * 2}));
      };
      var dataCollected = [];
      var thirdPromise = Promise.resolve({
        data: 3,
        next: {
          then: (resolver) => {
            if (!resolver) {
              // Skip catch call.
              return;
            }
            dataCollected.should.eql([4, 6, 8]);
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
      testChainedPromise.flatMap(addOnePromise).flatMap(doublePromise).forEach((v) => {
        dataCollected.push(v.data);
      }).catch((err) => console.error(err.stack, err));
    });
  });
});
