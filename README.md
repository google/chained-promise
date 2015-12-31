# Chained Promise: functional programming tools for recurring promises

We often find recurring patterns when handling asynchronous logic with promises, such as an HTTP endpoint that paginates and gives you a URL pointer to the next available dataset.

`Chained Promise` provides an extended Promise class that you can use to easily abstract out recurring patterns. See jsdocs for more detailed explanations.

TODO: more illustrious examples to come in future release.

## Usage Note

ChainedPromise extends Promise class, which is permitted by ES6 specification. However, most modern JS engines (including NodeJS) do not yet support this. Fortunately, most Promise polyfills and ES6 shims (es6-promise, rsvp, Babel polyfill) all support extending Promise. Users are advised to require a shim / polyfill of choice when using this library.

Disclaimer: This is not an official Google product.
