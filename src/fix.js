"use strict";

/**
 * Fix operator that continuously resolves next promise returned from the function that consumes
 * resolved previous value.
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
 * @param {function(<T>) : Promise} fn
 * @returns {function(Promise.<T>) : Promise.<Promise>}
 * @template T
 */
var fix = (fn) => (promise) => {
  var rejecter;
  var resolver = (v) => {
    try {
      var nextPromise = fn(v);
      nextPromise.then(resolver, rejecter);
    } catch(err) {
      rejecter(err);
    }
  };
  return new Promise((resolve, reject) => {
    rejecter = reject;
    promise.then(resolver, reject);
  });
};

export default fix;
