import "babel-polyfill";
import ChainedPromise from "chained-promise";
import rq from "request-promise";
const apiPoint = "https://en.wikipedia.org/w/api.php?" +
  "action=query&prop=links&format=json&plnamespace=0&titles=Plato&pllimit=500";

ChainedPromise.from(rq(apiPoint))
  .map(JSON.parse)
  .map((v) => {
    return {
      data: v.query.pages,
      next: v.continue ? rq(apiPoint + "&plcontinue=" + v.continue.plcontinue) :
      {[ChainedPromise.DONE]: "done fetching links from Plato page"}
    };
  })
  .forEach((v) => {
    Object.keys(v.data).forEach((pageId) => {
      v.data[pageId].links.forEach((link) => {
        console.log(link.title);
      });
    });
  })
  .then((v) => {
    console.log(v);
  })
  .catch((err) => console.error(err.stack, err));
