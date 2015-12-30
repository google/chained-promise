"use strict";

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
 * @param {function(<T>, function(<U>)) : Promise} fn
 * @returns {function(Promise.<T>) : Promise.<U>}
 * @template T
 * @template U
 */
var fix = (fn) => (promise) => {
  /**
   * Resolve handler to resolve the resulting promise and end the chain.
   */
  var finalResolver;
  var rejecter;
  var resolver = (v) => {
    try {
      var completeCalled = false;
      var completeValue;
      var complete = function(v) {
        completeCalled = true;
        completeValue = v;
      };
      var nextPromise = fn(v, complete);
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
