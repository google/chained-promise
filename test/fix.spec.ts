/*
 * Copyright 2015-2017 Google Inc. All Rights Reserved.
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
import {fix} from '../src/index';

const nullPromise = new Promise(() => undefined);

describe('fix', function() {
  it('resolves to next promise', function(done) {
    const valueResolved : Array<number> = [];
    const testPromises = {
      1: Promise.resolve(1),
      2: Promise.resolve(2),
      3: Promise.resolve(3)
    };
    const testFn = (v) => {
      valueResolved.push(v);
      if (v < 3) {
        return testPromises[v + 1];
      } else {
        expect(valueResolved).toEqual([1, 2, 3]);
        done();
        return nullPromise;
      }
    };
    fix(testFn)(testPromises[1]).catch((err) => console.error(err.stack, err));
  });
  it('rejects with error from promise in chain', function(done) {
    const valueResolved : Array<number> = [];
    const testPromises = {
      1: Promise.resolve(1),
      2: Promise.resolve(2),
      3: Promise.reject(3)
    };
    const testFn = (v) => {
      valueResolved.push(v);
      expect(v < 3).toBeTruthy;
      return testPromises[v + 1];
    };
    fix(testFn)(testPromises[1]).catch((err) => {
      expect(valueResolved).toEqual([1, 2]);
      expect(err).toEqual(3);
      done();
    });
  });
  it('rejects with error when function throws', function(done) {
    const valueResolved : Array<number> = [];
    const testPromises = {
      1: Promise.resolve(1),
      2: Promise.resolve(2),
      3: Promise.resolve(3)
    };
    const testFn = (v) => {
      valueResolved.push(v);
      if (v < 3) {
        return testPromises[v + 1];
      } else {
        throw 'testError';
      }
    };
    fix(testFn)(testPromises[1]).catch((err) => {
      expect(valueResolved).toEqual([1, 2, 3]);
      expect(err).toEqual('testError');
      done();
    });
  });
  it('stops the chain when complete call is made', function(done) {
    const factorialFiveFn = (v, complete) => {
      if (v.i === 5) {
        // If this it fifth iteration, complete the chain with the given
        // factorial value.
        return complete(v.f);
      } else {
        // Otherwise return a promise that resolves into the next iteration.
        return Promise.resolve({i: v.i + 1, f: v.f * (v.i + 1)});
      }
    };
    const initialPromise = Promise.resolve({i: 1, f: 1});
    fix(factorialFiveFn)(initialPromise)
        .then((v) => {
          expect(v).toEqual(120);  // 5!
          done();
        })
        .catch((err) => console.error(err.stack, err));
  });
});
