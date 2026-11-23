// THE DIRT: server-side RSS fetching with backup discovery feeds.
// Primary publisher feeds are tried first; if a source rejects/empties the feed,
// a Google News site-scoped RSS query is attempted for supported publishers.
const GOOGLE_NEWS = (query) =>
  'https://news.google.com/rss/search?q=' + encodeURIComponent(query) + '&hl=en-AU&gl=AU&ceid=AU:en';

const FEEDS = {
  pinkbike: ['https://www.pinkbike.com/pinkbike_xml_feed.php'],
  vital: [
    'https://feeds.vitalmtb.com/VitalMtbSpotlights',
    GOOGLE_NEWS('site:vitalmtb.com (downhill OR enduro OR mountain bike OR MTB) when:30d')
  ],
  flow: [
    'https://flowmountainbike.com/feed',
    'https://flowmountainbike.com/news/feed/',
    GOOGLE_NEWS('site:flowmountainbike.com (MTB OR downhill OR enduro OR bike) when:30d')
  ],
  enduro: ['https://enduro-mtb.com/en/feed/'],
  loamwolf: ['https://theloamwolf.com/feed/'],
  singletracks: ['https://www.singletracks.com/articles/feed/'],
  revolution: ['https://revolutionmtb.com.au/feed/'],
  bikeradar: [
    // BikeRadar's officially linked, mountain-biking-only RSS feed.
    'https://feeds.purplemanager.com/193c804a-a673-47bd-b09b-11baf4822a17/bikeradar-mtb-feed',
    GOOGLE_NEWS('site:bikeradar.com (mountain bike OR MTB OR downhill OR enduro) when:30d')
  ]
};

async function getFeed(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; TheDirtFeedReader/2.0)',
      'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*'
    },
    signal: AbortSignal.timeout(8500), redirect: 'follow'
  });
  if (!response.ok) throw Error('HTTP ' + response.status);
  const body = await response.text();
  if (!/<(?:rss|feed|rdf:RDF)(?:[\s>])/i.test(body.slice(0, 3000))) throw Error('Not RSS');
  if (!/<(?:item|entry)(?:[\s>])/i.test(body)) throw Error('RSS contained no stories');
  return body.slice(0, 1600000);
}

export default async function handler(request) {
  const id = new URL(request.url).searchParams.get('id');
  if (!Object.hasOwn(FEEDS, id)) return new Response('Unsupported source.', {status:400});
  const errors = [];
  for (const url of FEEDS[id]) {
    try {
      const body = await getFeed(url);
      return new Response(body, {
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, max-age=180, s-maxage=360',
          'X-The-Dirt-Feed': url.includes('news.google.com') ? 'backup' : 'publisher'
        }
      });
    } catch (error) {
      errors.push(new URL(url).hostname + ': ' + (error?.message || String(error)));
    }
  }
  return new Response('No available feed for ' + id + '. ' + errors.join(' | '), {status:502});
}
