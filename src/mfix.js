/**
 * MonadFix operator that continuously resolves next promise returned from the function.
 * @param {function(<T>) : Promise} fn
 * @returns {Promise}
 * @template T
 */
var mfix = function(fn) {
  return new Promise((resolve, reject) => {
    var resolver = (v) => {
      try {
        var result = fn(v);
        result.then(resolver).catch(reject);
      } catch(err) {
        reject(err);
      }
    };
  });
};

export default mfix;
