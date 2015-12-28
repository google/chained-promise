"use strict";

import chai from "chai";
import fix from "../src/fix";

chai.should();
var assert = chai.assert;

describe("fix", function() {
  var nullPromise = new Promise((resolver, rejecter) => {});
  it("resolves to next promise", function(done) {
    var valueResolved = [];
    var testPromises = {
      1: Promise.resolve(1),
      2: Promise.resolve(2),
      3: Promise.resolve(3)
    };
    var testFn = (v) => {
      valueResolved.push(v);
      if(v < 3) {
        return testPromises[v+1];
      } else {
        valueResolved.should.eql([1,2,3]);
        done();
        return nullPromise;
      }
    };
    fix(testFn)(testPromises[1]).catch((err) => console.error(err.stack, err));
  });
  it("rejects with error from promise in chain", function(done) {
    var valueResolved = [];
    var testPromises = {
      1: Promise.resolve(1),
      2: Promise.resolve(2),
      3: Promise.reject(3)
    };
    var testFn = (v) => {
      valueResolved.push(v);
      if(v < 3) {
        return testPromises[v+1];
      } else {
        assert.fail();
      }
    };
    fix(testFn)(testPromises[1]).catch((err) => {
      valueResolved.should.eql([1,2]);
      err.should.eql(3);
      done();
    });
  });
  it("rejects with error when function throws", function(done) {
    var valueResolved = [];
    var testPromises = {
      1: Promise.resolve(1),
      2: Promise.resolve(2),
      3: Promise.resolve(3)
    };
    var testFn = (v) => {
      valueResolved.push(v);
      if(v < 3) {
        return testPromises[v+1];
      } else {
        throw "testError";
      }
    };
    fix(testFn)(testPromises[1]).catch((err) => {
      valueResolved.should.eql([1,2,3]);
      err.should.eql("testError");
      done();
    });
  });
});
