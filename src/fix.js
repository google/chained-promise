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
/**
 * Fix operator that continuously resolves next promise returned from the function that consumes
 * previously resolved value.
 *
 * ```javascript
 * fix(fn)(promise).catch(errorHandler);
 * ```
 *
 * is equivalent to:
 *
 * ```javascript
 * promise.then(fn).then(fn).then(fn) ...
 *   .catch(errorHandler);
 * ```
 *
 * In addition, the function can complete the chain by calling the complete callback function
 * supplied as the second argument.
 *
 * For example, the following code fragment calculates 5!
 *
 * ```javascript
 * var promiseFactorial = (v, complete) => {
 *   if (v.i==5) {
 *     complete(v.f);
 *   } else {
 *     return Promise.resolve({i: v.i+1, f: v.f * (v.i + 1)});
 *   }
 * };
 *
 * fix(promiseFactorial)(Promise.resolve({i:1, f:1})).then(console.log);
 * ```
 *
 * @param {function(T, function(U)) : Promise} fn
 * @returns {function(Promise.<T>) : Promise.<U>}
 * @template T
 * @template U
 */
const fix = (fn) => (promise) => {
  /**
   * Resolve handler to resolve the resulting promise and end the chain.
   */
  let finalResolver;
  let rejecter;
  let resolver = (v) => {
    try {
      let completeCalled = false;
      let completeValue;
      let complete = function (vComplete) {
        completeCalled = true;
        completeValue = vComplete;
      };
      const nextPromise = fn(v, complete);
      if (completeCalled) {
        finalResolver(completeValue);
        resolver = null;
      } else {
        nextPromise.then(resolver, rejecter);
      }
      complete = null;
    } catch(err) {
      rejecter(err);
    }
  };
  return new Promise((resolve, reject) => {
    finalResolver = resolve;
    rejecter = reject;
    promise.then(resolver, reject);
  });
};

export default fix;
