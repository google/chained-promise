"use strict";
import fix from "./fix";

/**
 * An extended promise for recurring promises with multiple compositions.
 *
 * ```javascript
 * var chained = ChainedPromise.from(promise);
 * chained.flatMap(a).flatMap(b).flatMap(c).forEach(fn).catch(onRejected);
 * ```
 *
 * is equivalent to:
 *
 * ```javascript
 * promise.then(a).then(b).then(c).then(fn).then((v) => v.next)
 *        .then(a).then(b).then(c).then(fn).then((v) => v.next)
 *        .then(a).then(b).then(c).then(fn).then((v) => v.next)
 *        ...
 *        .catch(onRejected);
 * ```
 *
 * The {@code (v) => v.next} function is a default {@link ChainedPromise#next} value picker. We can
 * supply custom value picker to the {@link ChainedPromise#constructor} and
 * {@link ChainedPromise#from}.
 *
 * @template T
 */
class ChainedPromise extends Promise {
  /**
   * Initializes fields common to both {@link ChainedPromise#constructor} and
   * {@link ChainedPromise#from} code path.
   * @private
   */
  _initialize() {
    this.flatMapChain = [];
  }

  /**
   * Constructs next {@link ChainedPromise} that carries over settings and composition properties
   * of the current one.
   * @param {T} v
   * @returns {ChainedPromise.<T>}
   * @private
   * @template T
   */
  _nextPromise(v) {
    var nextPromise = ChainedPromise.from(this.next(v), this.next);
    nextPromise.flatMapChain = this.flatMapChain;
    return nextPromise;
  }

  /**
   * @param executor - Promise executor
   * @param {function(<T>) : Promise.<T>} next
   * @template T
   */
  constructor(executor, next = ChainedPromise.nextFieldPicker("next")) {
    super(executor);
    /**
     * Function to construct promise to next item in chain.
     * @type {function(<T>) : Promise.<T>}
     * @template T
     */
    this.next = next;
    this._initialize();
  }

  /**
   * Creates a ChainedPromise that extends given Promise.
   * @param {Promise.<T>} innerPromise
   * @param {function(<T>) : Promise.<T>} next
   * @returns {ChainedPromise.<T>}
   * @template T
   */
  static from(innerPromise, next = ChainedPromise.nextFieldPicker("next")) {
    Object.setPrototypeOf(innerPromise, ChainedPromise.prototype);
    innerPromise.next = next;
    innerPromise._initialize();

    return innerPromise;
  }

  /**
   * Returns a function to pick the given attribute.
   * @param attr - name of the attribute (that will contain the next promise).
   * @returns {function(<T>) : Promise.<T>}
   * @template T
   */
  static nextFieldPicker(attr) {
    return (x) => x[attr];
  }

  /**
   * @param {function(<T>)} fn
   * @returns {Promise}
   * @template T
   */
  forEach(fn) {
    return fix((v) => {
      fn(v);
      return this._nextPromise(v);
    })(this);
  }

  /**
   * Stacks up flat map operation to be performed in this promise. See {@link ChainedPromise} for
   * examples.
   * @param {function(<T>) : Promise.<U>} fn
   * @returns {ChainedPromise.<U>}
   * @template T
   * @template U
   */
  flatMap(fn) {
    this.flatMapChain.push(fn);
    return this;
  }

  /**
   * Overrides Promise.then to compose with extra functions. See {@link ChainedPromise} for the
   * specifics of available compositions.
   * @returns {Promise.<T>}
   * @template T
   */
  then(onFulfilled, onRejected) {
    if (!onFulfilled) {
      // Skip processing in case of Promise.catch call.
      return super.then(onFulfilled, onRejected);
    }
    // Branch out no-op special case, since "super" in ES6 is not a first-class citizen.
    if (this.flatMapChain.length == 0) {
      return super.then(onFulfilled, onRejected);
    } else {
      var flatMapped = super.then(this.flatMapChain[0]);
      flatMapped = this.flatMapChain.slice(1).reduce((x,y) => x.then(y), flatMapped);
      return flatMapped.then(onFulfilled, onRejected);
    }
  }
}

export default ChainedPromise;
