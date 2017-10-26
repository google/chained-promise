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
import fix from './fix';

type SkipToken<T> = {
  data: symbol,
  next: ChainedPromise<T>
};

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
 * `(v) => v.next` function is the default {@link ChainedPromise#next} value
 * picker. We can supply custom value picker to the {@link
 * ChainedPromise#constructor} and {@link ChainedPromise#from}.
 */
class ChainedPromise<T> extends Promise<T> {
  private flatMapChain: Array<(v: any) => Promise<any>>;

  /**
   * Function to construct promise to next item in chain.
   */
  public next: (t: T) => Promise<T>;

  /**
   * Initializes fields common to both {@link ChainedPromise#constructor}
   * and {@link ChainedPromise#from} code path.
   */
  private initialize() {
    this.flatMapChain = [];
  }

  /**
   * Constructs next {@link ChainedPromise} that carries over settings and
   * composition properties of the current one.
   */
  private nextPromise<U>(v: T|SkipToken<T>): ChainedPromise<U> {
    let nextPromise;
    if ((v as SkipToken<T>).data &&
        (v as SkipToken<T>).data === ChainedPromise.SKIP) {
      nextPromise = ChainedPromise.from((v as SkipToken<T>).next, this.next);
    } else {
      nextPromise = ChainedPromise.from(this.next(v as T), this.next);
    }
    nextPromise.flatMapChain = this.flatMapChain;
    return ((nextPromise as any) as ChainedPromise<U>);
  }

  /**
   * @param executor Promise executor
   * @param next
   */
  constructor(executor, next = ChainedPromise.nextFieldPicker<T>('next')) {
    super(executor);
    this.next = next;
    this.initialize();
  }

  /**
   * Creates a ChainedPromise that extends given Promise.
   */
  static from<T>(
      innerPromise: Promise<T>,
      next = ChainedPromise.nextFieldPicker<T>('next')): ChainedPromise<T> {
    return new ChainedPromise((res, rej) => innerPromise.then(res, rej), next);
  }

  /**
   * Returns a function to pick the given attribute.
   * @param {string} attr Name of the attribute (that will contain the next promise).
   * @returns {function(T) : Promise.<T>}
   * @template T
   */
  static nextFieldPicker<T>(attr: string): (v: T) => Promise<T> {
    return (x) => x[attr];
  }

  /**
   * Creates `[ChainedPromise, callback, error]` array.
   *
   * Calling callback with a value `v` will cause the promise to be resolved
   * into
   * `{data: v, next: nextPromise}`, `nextPromise` being another {@link
   * ChainedPromise} who gets resolved next time `callback` is called.
   *
   * Calling `error` function will cause the promise to be rejected.
   * @returns {Array}
   * @template T
   */
  static createPromiseCallbackPair<U, T = {data: U, next: ChainedPromise<T>}>():
      [ChainedPromise<T>, (v: U) => void, (error: any) => void] {
    let resolver;
    let rejecter;
    const callback = (v) => {
      const oldResolver = resolver;
      const nextPromise = new ChainedPromise((resolve, reject) => {
        resolver = resolve;
        rejecter = reject;
      });
      oldResolver({data: v, next: nextPromise});
    };
    const error = (err) => {
      rejecter(err);
    };
    const promise = new ChainedPromise<T>((resolve, reject) => {
      resolver = resolve;
      rejecter = reject;
    });
    return [promise, callback, error];
  }

  /**
   * Applies the given function on all values in the chain, until the {@link
   * ChainedPromise#next} value returns an object with {@link
   * ChainedPromise.DONE} symbol.
   */
  forEach<V>(fn: (v: T) => void): Promise<V> {
    return fix<T, V>((v: T|SkipToken<T>, complete) => {
      let nextPromise;
      if ((v as SkipToken<T>).data &&
          (v as SkipToken<T>).data === ChainedPromise.SKIP) {
        nextPromise = (v as SkipToken<T>).next;
      } else {
        fn(v as T);
        nextPromise = this.next(v as T);
      }
      if (nextPromise[ChainedPromise.DONE] !== undefined) {
        return complete(nextPromise[ChainedPromise.DONE]);
      } else {
        return this.nextPromise(v as T);
      }
    })(this);
  }

  /**
   * Stacks up flat map operation to be performed in this promise. See {@link
   * ChainedPromise} for examples.
   */
  flatMap<U>(fn: (v: T) => Promise<U>): ChainedPromise<U> {
    this.flatMapChain.push(fn);
    return ((this as any) as ChainedPromise<U>);
  }

  /**
   * Non-async equivalent of {@link ChainedPromise#flatMap}.
   */
  map<U>(fn: (T) => U): ChainedPromise<U> {
    this.flatMap((v) => new ChainedPromise((res) => res(fn(v))));
    return ((this as any) as ChainedPromise<U>);
  }

  /**
   * Overrides Promise.then to compose with extra functions. See {@link
   * ChainedPromise} for the specifics of available compositions.
   */
  then<TResult1 = T | SkipToken<T>, TResult2 = never>(
      onFulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>)|null|
      undefined,
      onRejected?: (result: any) => TResult2 |
          PromiseLike<TResult2>): Promise<TResult1|TResult2> {
    if (!onFulfilled) {
      // Skip processing in case of Promise.catch call.
      // TODO: fix type.
      return super.then(onFulfilled as any, onRejected as any) as any;
    }
    // Branch out no-op special case, since "super" in ES6 is not a first-class
    // citizen.
    if (this.flatMapChain.length === 0) {
      // TODO: fix type.
      return super.then(onFulfilled as any, onRejected as any) as any;
    } else {
      const firstFlatMapped = super.then(this.flatMapChain[0]);
      let flatMapped = this.flatMapChain.slice(1).reduce((x, y) => {
        return x.then((res) => {
          if (res.data && res.data === ChainedPromise.SKIP) {
            return res;
          }
          return y(res);
        });
      }, firstFlatMapped);
      return flatMapped.then(onFulfilled, onRejected);
    }
  }

  /**
   * Flat-maps current promise chain to resolve into successive accumulation of
   * values, from given accumulator. Accumulator should pass on next promise to
   * the accumulated value.
   * @param fn Accumulator that takes previous accumulation and current value,
   * and calculate next accumulation.
   * @param initial Initial accumulated value to start with.
   */
  accumulate<U>(fn: (U, T) => Promise<U>, initial: U): ChainedPromise<U> {
    let accumulated = initial;
    this.flatMap((v) => fn(accumulated, v)).map((acc) => {
      accumulated = acc;
      return acc;
    });
    return ((this as any) as ChainedPromise<U>);
  }

  /**
   * Takes a join spec and flatMaps current ChainedPromise accordingly. A join
   * spec is recursively defined as follows:
   *
   *   * If the spec is a function taking a value and returning a promise, then
   * the join operation evaluates the function with current value and replaces
   * the value with the resulting promise.
   *
   *   * If the spec is an array of a spec, then the current value is assumed to
   * be an array, and each element in the current value is mapped to the inner
   * spec.
   *
   *   * If the spec is an object with keys to specs, then the field of the
   * current value with each key is replaced with the result of each join
   * operations with the inner spec.
   * @param {(function(T): (Promise.<U>) | Array | Object)} spec
   * @returns {ChainedPromise.<V>}
   * @template T
   * @template U
   * @template V
   */
  join<V>(spec: ((t: T) => Promise<{}>)|Array<Object>|
          Object): ChainedPromise<V> {
    this.flatMap((v) => {
      function pickAndJoin(curSpec, curValue) {
        if (typeof curSpec === 'function') {
          return curSpec(curValue);
        }
        if (curSpec instanceof Array) {
          // TODO(yiinho): more thorough error handling.
          return Promise.all(curValue.map((x) => pickAndJoin(curSpec[0], x)));
        }
        if (curSpec instanceof Object) {
          return Promise
              .all(Object.keys(curSpec).map(
                  (key) => pickAndJoin(curSpec[key], curValue[key])
                               .then((joinResult) => {
                                 const result = {};
                                 result[key] = joinResult;
                                 return result;
                               })))
              .then((joinedValues) => {
                joinedValues.forEach((join) => Object.assign(curValue, join));
                return curValue;
              });
        }
        throw new TypeError(
            'Specification not recognized: ' + JSON.stringify(spec));
      }
      return pickAndJoin(spec, v);
    });
    return this as any as ChainedPromise<V>;
  }

  /**
   * Collects results (including the final "done" value) into an array.
   * @param fn Mapper function to be applied to each data points (except
   * the final "done" value) before collecting into the result array.
   */
  collect<U, V>(fn: (t: T) => (U | V) = (x) => (x as any as U)) {
    const collected: Array<U|V> = [];
    return this
        .forEach<V>((v) => {
          collected.push(fn(v));
        })
        .then((done) => {
          collected.push(done);
          return collected;
        });
  }

  /**
   * Filters for values that evaluates to `true`.
   */
  filter(fn: (t: T) => boolean): ChainedPromise<T|SkipToken<T>> {
    return this.map<T|SkipToken<T>>((v) => {
      if (!fn(v)) {
        return {data: ChainedPromise.SKIP, next: this.next(v)};
      }
      return v;
    });
  }

  /**
   * Symbol to indicate the end of promise chains. Having
   * `{[ChainedPromise.DONE]: <some value>}` as a next value will indicate the
   * end of the chain, and will cause fixed promises such as
   * {@link ChainedPromise#forEach} to resolve to the given value.
   */
  static DONE = Symbol('ChainedPromise.DONE');

  private static SKIP = Symbol('ChainedPromise.SKIP');
}

export default ChainedPromise;
