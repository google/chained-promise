/*
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
"use strict";

import chai from "chai";
import {fix} from "../src/index";

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
  it("stops the chain when complete call is made", function(done) {
    var factorialFiveFn = (v, complete) => {
      if (v.i == 5) {
        // If this it fifth iteration, complete the chain with the given factorial value.
        complete(v.f);
      } else {
        // Otherwise return a promise that resolves into the next iteration.
        return Promise.resolve({i: v.i + 1, f: v.f * (v.i + 1)});
      }
    };
    var initialPromise = Promise.resolve({i: 1, f: 1});
    fix(factorialFiveFn)(initialPromise).then((v) => {
      v.should.eql(120); // 5!
      done();
    }).catch((err) => console.error(err.stack, err));
  });
});
