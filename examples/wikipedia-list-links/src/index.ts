import fetch from 'node-fetch';
import ChainedPromise from 'chained-promise';
const apiPoint = 'https://en.wikipedia.org/w/api.php?' +
    'action=query&prop=links&format=json&plnamespace=0&titles=Plato&pllimit=100';

ChainedPromise.from<Response>(fetch(apiPoint))
    .flatMap((res) => res.json())
    .map((v) => {
      return {
        data: v.query.pages,
        next: v.continue ?
            fetch(apiPoint + '&plcontinue=' + encodeURIComponent(v.continue.plcontinue)) :
            {[ChainedPromise.DONE]: 'done fetching links from Plato page'}
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
