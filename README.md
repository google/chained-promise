# Chained Promise: functional programming tools for recurring promises

[![Build Status](https://travis-ci.org/google/chained-promise.svg?branch=travis-ci)](https://travis-ci.org/google/chained-promise) [![Coverage Status](https://coveralls.io/repos/google/chained-promise/badge.svg?branch=master&service=github)](https://coveralls.io/github/google/chained-promise?branch=master) [![Join the chat at https://gitter.im/google/chained-promise](https://badges.gitter.im/google/chained-promise.svg)](https://gitter.im/google/chained-promise?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

We often find recurring patterns when handling asynchronous logic with promises, such as an HTTP endpoint that paginates and gives you a URL pointer to the next available dataset.

`Chained Promise` provides an extended Promise class that you can use to easily abstract out recurring patterns. See jsdocs for more detailed explanations.

## Example

Suppose we are querying Wikipedia API to get the list of all linked pages from "Plato" page:
 
```javascript
const apiPoint = "https://en.wikipedia.org/w/api.php?" +
  "action=query&prop=links&format=json&plnamespace=0&titles=Plato&pllimit=500";
```

With `request-promise` we can turn the end point into a promise. Then we can use `ChainedPromise` to extend the promise:

```javascript
import ChainedPromise from "chained-promise";
import rq from "request-promise";

ChainedPromise.from(rq(apiPoint))
```

First thing we want to do is to parse the resulting JSON:

```javascript
  .map(JSON.parse)
```

Now we have a promise that resolves into a JS object. Next we need to map the result into the format that `ChainedPromise` is expecting.
 
```javascript
  .map((v) => {
    return {
      data: v.query.pages,
      next: v.continue ? rq(apiPoint + "&plcontinue=" + v.continue.plcontinue) :
      {[ChainedPromise.DONE]: "done fetching links from Plato page"}
    };
  })
```

The `data` field contains the material content of the value, while the `next` field contains either the promise to the next batch of data, or `{[ChainedPromise.DONE]: lastNode}` which `ChainedPromise` recognizes to be the terminal node.

Now that the chaining of the value has been configured, we can work on the series of data.

```javascript
  .forEach((v) => {
    Object.keys(v.data).forEach((pageId) => {
      v.data[pageId].links.forEach((link) => {
        console.log(link.title);
      });
    });
  })
```

This executes the given callback function, and the result itself is a promise that resolves into the value of the terminal node when it reaches the end.
 
See [the example project](examples/wikipedia-list-links) for the full example code. Also see jsdoc to [ChainedPromise.js](src/ChainedPromise.js) for more explanation of other functions such as `flatMap`.

## Usage Note

ChainedPromise extends Promise class, which is permitted by ES6 specification. However, most modern JS engines (including NodeJS) do not yet support this. Fortunately, most Promise polyfills and ES6 shims (es6-promise, rsvp, Babel polyfill) all support extending Promise. Users are advised to require a shim / polyfill of choice when using this library.

Disclaimer: This is not an official Google product.
