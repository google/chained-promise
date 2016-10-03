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
import chai from "chai";
import "babel-polyfill";
import ChainedPromise from "../src/index";

chai.should();

describe("ChainedPromise", function () {
  describe("createPromiseCallbackPair", function () {
    it("creates ChainedPromise and callback functions", function (done) {
      const dataCollected = [];
      const [promise, callback] = ChainedPromise.createPromiseCallbackPair();
      callback(1);
      callback(2);
      callback(3);
      promise.forEach((v) => {
        dataCollected.push(v.data);
        if (dataCollected.length === 3) {
          dataCollected.should.eql([1, 2, 3]);
          done();
        }
      }).catch(done);
    });
  });
  it("creates error function which rejects the promise", function (done) {
    const dataCollected = [];
    const [promise, callback, error] = ChainedPromise.createPromiseCallbackPair();
    callback(1);
    callback(2);
    error("Error!");
    promise.forEach(({data}) => {
      dataCollected.push(data);
    }).catch((err) => {
      dataCollected.should.eql([1, 2]);
      err.should.eql("Error!");
      done();
    });
  });
  describe("forEach", function () {
    it("runs function on each value", function (done) {
      const dataCollected = [];
      const thirdPromise = Promise.resolve({
        data: 3,
        next: {[ChainedPromise.DONE]: "done"}
      });
      const secondPromise = Promise.resolve({
        data: 2,
        next: thirdPromise
      });
      const testChainedPromise = new ChainedPromise((resolver) => {
        resolver({
          data: 1,
          next: secondPromise
        });
      });
      testChainedPromise.forEach((v) => {
        dataCollected.push(v.data);
      }).then((v) => {
        v.should.eql("done");
        dataCollected.should.eql([1, 2, 3]);
        done();
      }).catch(done);
    });
  });
  it("bubbles up error", function (done) {
    const dataCollected = [];
    const testChainedPromise = ChainedPromise.from(Promise.resolve({
      data: 1,
      next: Promise.resolve({
        data: 2,
        next: Promise.reject("Error!")
      })
    }));
    testChainedPromise
      .forEach(({data}) => {
        dataCollected.push(data);
      })
      .catch((err) => {
        dataCollected.should.eql([1, 2]);
        err.should.eql("Error!");
        done();
      });
  });
  describe("flatMap", function () {
    it("composes flat map functions", function (done) {
      const addOnePromise = function (v) {
        return Promise.resolve(Object.assign(v, {data: v.data + 1}));
      };
      const doublePromise = function (v) {
        return Promise.resolve(Object.assign(v, {data: v.data * 2}));
      };
      const dataCollected = [];
      const thirdPromise = Promise.resolve({
        data: 3,
        next: {[ChainedPromise.DONE]: "done"}
      });
      const secondPromise = Promise.resolve({
        data: 2,
        next: thirdPromise
      });
      const testChainedPromise = new ChainedPromise((resolver) => {
        resolver({
          data: 1,
          next: secondPromise
        });
      });
      testChainedPromise.flatMap(addOnePromise).flatMap(doublePromise).forEach((v) => {
        dataCollected.push(v.data);
      }).then((v) => {
        v.should.eql("done");
        dataCollected.should.eql([4, 6, 8]);
        done();
      }).catch(done);
    });
  });
  describe("map", function () {
    it("composes map functions", function (done) {
      const addOneFunction = (v) => Object.assign(v, {data: v.data + 1});
      const doubleFunction = (v) => Object.assign(v, {data: v.data * 2});
      const dataCollected = [];
      const thirdPromise = Promise.resolve({
        data: 3,
        next: {[ChainedPromise.DONE]: "done"}
      });
      const secondPromise = Promise.resolve({
        data: 2,
        next: thirdPromise
      });
      const testChainedPromise = new ChainedPromise((resolver) => {
        resolver({
          data: 1,
          next: secondPromise
        });
      });
      testChainedPromise.map(addOneFunction).map(doubleFunction).forEach((v) => {
        dataCollected.push(v.data);
      }).then((v) => {
        v.should.eql("done");
        dataCollected.should.eql([4, 6, 8]);
        done();
      }).catch(done);
    });
  });
  describe("then", function () {
    it("bypasses composition when registering reject handler only", function (done) {
      const testChainedPromise = new ChainedPromise((resolver) => {
        resolver(1);
      });
      testChainedPromise.flatMap((v) => v * 2);
      testChainedPromise.then(undefined, console.error);
      testChainedPromise.then((v) => {
        v.should.eql(2); // i.e. flatMapped function should have been invoked only once.
        done();
      });
    });
  });
  describe("accumulate", function () {
    it("accumulates values", function (done) {
      const dataCollected = [];
      const thirdPromise = Promise.resolve({
        data: 3,
        next: {[ChainedPromise.DONE]: "done"}
      });
      const secondPromise = Promise.resolve({
        data: 2,
        next: thirdPromise
      });
      const testChainedPromise = new ChainedPromise((resolver) => {
        resolver({
          data: 1,
          next: secondPromise
        });
      });
      testChainedPromise.accumulate((prevSum, newValue) => {
        return Promise.resolve(Object.assign(newValue, {data: prevSum.data + newValue.data}));
      }, {data: 0}).forEach((v) => {
        dataCollected.push(v.data);
      }).then((v) => {
        v.should.eql("done");
        dataCollected.should.eql([1, 3, 6]);
        done();
      }).catch(done);
    });
  });
  describe("join", function () {
    it("extracts field", function (done) {
      const dataCollected = [];
      const secondPromise = new ChainedPromise((resolver) => {
        resolver({
          data: {
            name: "Test Person 2",
            ref: 43
          },
          next: {[ChainedPromise.DONE]: "done"}
        });
      });
      const testChainedPromise = new ChainedPromise((resolver) => {
        resolver({
          data: {
            name: "Test Person",
            ref: 42
          },
          next: secondPromise
        });
      });
      testChainedPromise.join({
        data: {ref: (v) => new Promise((res) => res("Reference " + v))}
      }).forEach((v) => {
        dataCollected.push(v.data);
      }).then((v) => {
        v.should.eql("done");
        dataCollected.should.eql([
          {name: "Test Person", ref: "Reference 42"},
          {name: "Test Person 2", ref: "Reference 43"}
        ]);
        done();
      }).catch(done);
    });
    it("supports multiple fields", function (done) {
      const dataCollected = [];
      const testChainedPromise = new ChainedPromise((resolver) => {
        resolver({
          data: {
            name: "Test Person",
            book: {
              ref: 42
            },
            car: {
              ref: 43
            }
          },
          next: {[ChainedPromise.DONE]: "done"}
        });
      });
      testChainedPromise.join({
        data: {
          book: {
            ref: (v) => new Promise((res) => res("Book reference " + v))
          },
          car: {
            ref: (v) => new Promise((res) => res("Car reference " + v))
          }
        }
      }).forEach((v) => {
        dataCollected.push(v.data);
      }).then((v) => {
        v.should.eql("done");
        dataCollected.should.eql([{
          name: "Test Person",
          book: {ref: "Book reference 42"},
          car: {ref: "Car reference 43"}
        }]);
        done();
      }).catch(done);
    });
    it("maps array of values", function (done) {
      const dataCollected = [];
      const secondPromise = new ChainedPromise((resolver) => {
        resolver({
          data: {
            name: "Test Person 2",
            ref: [44, 45]
          },
          next: {[ChainedPromise.DONE]: "done"}
        });
      });
      const testChainedPromise = new ChainedPromise((resolver) => {
        resolver({
          data: {
            name: "Test Person",
            ref: [42, 43]
          },
          next: secondPromise
        });
      });
      testChainedPromise.join({
        data: {ref: [(v) => new Promise((res) => res("Reference " + v))]}
      }).forEach((v) => {
        dataCollected.push(v.data);
      }).then((v) => {
        v.should.eql("done");
        dataCollected.should.eql([
          {name: "Test Person", ref: ["Reference 42", "Reference 43"]},
          {name: "Test Person 2", ref: ["Reference 44", "Reference 45"]}
        ]);
        done();
      }).catch(done);
    });
    it("supports object specification inside an array", function (done) {
      const dataCollected = [];
      const secondPromise = new ChainedPromise((resolver) => {
        resolver({
          data: {
            name: "Test Person 2",
            refs: [{book: 44}, {book: 45}]
          },
          next: {[ChainedPromise.DONE]: "done"}
        });
      });
      const testChainedPromise = new ChainedPromise((resolver) => {
        resolver({
          data: {
            name: "Test Person",
            refs: [{book: 42}, {book: 43}]
          },
          next: secondPromise
        });
      });
      testChainedPromise.join({
        data: {refs: [{book: (v) => new Promise((res) => res("Reference " + v))}]}
      }).forEach((v) => {
        dataCollected.push(v.data);
      }).then((v) => {
        v.should.eql("done");
        dataCollected.should.eql([{
          name: "Test Person",
          refs: [{book: "Reference 42"}, {book: "Reference 43"}]
        }, {
          name: "Test Person 2",
          refs: [{book: "Reference 44"}, {book: "Reference 45"}]
        }]);
        done();
      }).catch(done);
    });
    it("throws when the given spec is illegal", function (done) {
      const testChainedPromise = new ChainedPromise((resolver) => {
        resolver({
          data: {
            name: "Test Person",
            ref: 42
          },
          next: {[ChainedPromise.DONE]: "done"}
        });
      });
      testChainedPromise.join({
        data: {name: "hello"}
      }).then((v) => {
        done(v);
      }).catch(() => {
        done();
      });
    });
  });
});
