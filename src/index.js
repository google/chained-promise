"use strict";
import create from "lodash.create";
import mfix from "mfix";

/**
 * An extended promise for recurring promises.
 * @template T
 */
class ChainedPromise extends Promise {
  /**
   * Helper object to encapsulate getting and setting next promises from the resolved value.
   * @typedef {Object} NextPicker.<T>
   * @property {function(<T>) : Promise} getter
   * @property {function(<T>, Promise.<T>) : <T>} setter
   * @template T
   */

  /**
   * @param executor - Promise executor
   * @param {NextPicker.<T>} nextPicker
   * @template T
   */
  constructor(executor, nextPicker = ChainedPromise.nextFieldPicker("next")) {
    super(executor);
    this.next = nextPicker;
  }

  /**
   * Creates a ChainedPromise that extends given Promise.
   * @param {Promise.<T>} innerPromise
   * @param {NextPicker} nextPicker
   * @returns {ChainedPromise.<T>}
   * @template T
   */
  static from(innerPromise, nextPicker = ChainedPromise.nextFieldPicker("next")) {
    var chainedPromise = create(innerPromise, ChainedPromise.prototype);
    chainedPromise.next = nextPicker;

    return chainedPromise;
  }

  /**
   * Helper function to encapsulate getting and setting next promises.
   * @param attr - name of the attribute that will contain next promise.
   * @returns {NextPicker.<T>}
   * @template T
   */
  static nextFieldPicker(attr) {
    return {
      getter: (x) => x[attr],
      setter: (x, nextVal) => (x[attr] = nextVal)
    }
  }

  /**
   * @param {function(<T>)} fn
   * @returns {Promise}
   * @template T
   */
  forEach(fn) {
    return mfix((v) => {
      fn(v);
      return this.next.getter(v);
    });
  }

  /**
   * @param {function(<T>) : Promise.<U>} fn
   * @returns {ChainedPromise.<U>}
   * @template T
   * @template U
   */
  flatMap(fn) {
    var fixedPointFlatPromise = this;
    var next = this.next;

    /**
     * Lazily create next ChainedPromise instance with flat-mapped values.
     * @returns {ChainedPromise.<U>}
     * @template U
     */
    var fixedPointFlattened = () => new ChainedPromise((resolve, reject) => {
      fixedPointFlatPromise.then((v) => {
        fn(v).then((flattened) => {
          next.setter(flattened, fixedPointFlattened());
          resolve(flattened);
          reject = null;
        }, (err) => {
          resolve = null;
          reject(err);
        });
        fixedPointFlatPromise = next.getter(v);
      }).catch(reject);
    }, next);

    return fixedPointFlattened();
  }
}

export default ChainedPromise;
