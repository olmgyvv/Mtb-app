// Fetch publisher RSS on the server, rather than from Safari (where CORS blocks it).
const FEEDS = {
  pinkbike: 'https://www.pinkbike.com/pinkbike_xml_feed.php',
  vital: 'https://feeds.vitalmtb.com/VitalMtbSpotlights',
  flow: 'https://flowmountainbike.com/feed',
  enduro: 'https://enduro-mtb.com/en/feed/',
  loamwolf: 'https://theloamwolf.com/feed/',
  singletracks: 'https://www.singletracks.com/articles/feed/',
  revolution: 'https://revolutionmtb.com.au/feed/'
};
export default async function handler(request) {
  const id = new URL(request.url).searchParams.get('id');
  if (!Object.hasOwn(FEEDS, id)) return new Response('Source not supported by this server. Custom sources require an update.', {status:400});
  try {
    const response = await fetch(FEEDS[id], {
      headers: {'User-Agent':'Mozilla/5.0 (compatible; TheDirtFeedReader/1.0)', 'Accept':'application/rss+xml, application/atom+xml, application/xml, text/xml, */*'},
      signal: AbortSignal.timeout(11000), redirect:'follow'
    });
    if (!response.ok) return new Response('Publisher refused feed: '+response.status, {status:502});
    const body = await response.text();
    if (!/<(?:rss|feed|rdf:RDF)(?:[\s>])/i.test(body.slice(0,3000))) return new Response('Publisher returned no RSS feed', {status:502});
    return new Response(body.slice(0,1600000), {headers:{'Content-Type':'application/xml; charset=utf-8', 'Cache-Control':'public, max-age=300, s-maxage=600'}});
  } catch (err) { return new Response('Could not reach publisher: '+String(err.message||err), {status:502}); }
}
