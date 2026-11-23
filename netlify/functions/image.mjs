// THE DIRT image helper: safely fetch publication images and discover article cover photos.
// Use narrowly scoped domains. Redirects are validated at every hop.
const publisherHosts = [
  'pinkbike.com', 'vitalmtb.com', 'flowmountainbike.com', 'enduro-mtb.com',
  'theloamwolf.com', 'singletracks.com', 'revolutionmtb.com.au', 'bikeradar.com'
];
const imageHosts = [
  ...publisherHosts, 'pb-cdn.com', 'vitalcdn.com', 'wp.com', 'wordpress.com',
  'gravatar.com', 'cloudfront.net', 'imgix.net', 'immediate.co.uk',
  'purpledshub.com', 'futurecdn.net', 'futureplc.com', 'wpengine.com',
  'amazonaws.com', 'googleusercontent.com', 'gstatic.com', 'cdninstagram.com',
  'ytimg.com', 'vimeocdn.com'
];
const allowed = (hostname, list) => list.some(d => hostname === d || hostname.endsWith('.' + d));
function safeTarget(raw, list) {
  const u = new URL(raw);
  if (u.protocol !== 'https:' || u.username || u.password || u.port || !allowed(u.hostname.toLowerCase(), list)) throw Error('Unapproved host');
  return u;
}
async function getFollowed(raw, list, accept, timeoutMs = 7500) {
  let u = safeTarget(raw, list);
  for (let n = 0; n < 4; n++) {
    const res = await fetch(u.href, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TheDirtReader/3.0)',
        'Accept': accept,
        'Referer': u.origin + '/'
      },
      signal: AbortSignal.timeout(timeoutMs), redirect: 'manual'
    });
    if ([301,302,303,307,308].includes(res.status)) {
      const loc = res.headers.get('location');
      if (!loc) throw Error('Redirect without location');
      u = safeTarget(new URL(loc, u).href, list);
      continue;
    }
    if (!res.ok) throw Error('Upstream ' + res.status);
    return res;
  }
  throw Error('Too many redirects');
}
function decodeEntities(s) {
  return s.replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&#x([0-9a-f]+);/gi, (_,h) => String.fromCodePoint(parseInt(h,16))).replace(/&#(\d+);/g, (_,d) => String.fromCodePoint(+d));
}
function coverFromHtml(html, articleUrl) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const key of ['og:image:secure_url','og:image','twitter:image']) {
    for (const tag of tags) {
      const attrs = {};
      for (const m of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) attrs[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4];
      if ((attrs.property || attrs.name || '').toLowerCase() === key && attrs.content) {
        try { return new URL(decodeEntities(attrs.content),articleUrl).href; } catch {}
      }
    }
  }
  return '';
}
async function imageBytes(url) {
  const r = await getFollowed(url, imageHosts, 'image/avif,image/webp,image/*,*/*;q=0.8');
  const type = (r.headers.get('content-type') || '').split(';')[0].toLowerCase();
  if (!/^image\/(jpeg|png|webp|gif|avif)$/.test(type)) throw Error('Not supported image data');
  const max = 5 * 1024 * 1024;
  if (Number(r.headers.get('content-length') || 0) > max) throw Error('Image too large');
  const body = await r.arrayBuffer();
  if (body.byteLength > max) throw Error('Image too large');
  return new Response(body, {headers: {'Content-Type':type, 'Cache-Control':'public, max-age=3600, s-maxage=86400', 'X-Content-Type-Options':'nosniff'}});
}
export default async function handler(request) {
  const params = new URL(request.url).searchParams;
  const imageUrl = params.get('url');
  const articleUrl = params.get('article');
  if (!imageUrl && !articleUrl) return new Response('Missing image or article URL', {status:400});
  try {
    if (imageUrl) return await imageBytes(imageUrl);
    const article = safeTarget(articleUrl, publisherHosts);
    const res = await getFollowed(article.href, publisherHosts, 'text/html,application/xhtml+xml');
    const type = res.headers.get('content-type') || '';
    if (!type.includes('text/html')) throw Error('Article was not HTML');
    const html = (await res.text()).slice(0,500000);
    const imageUrlFromPage = coverFromHtml(html,article.href);
    if (!imageUrlFromPage) throw Error('No cover image found');
    return await imageBytes(imageUrlFromPage);
  } catch (err) {
    return new Response('Image unavailable: ' + String(err?.message || err), {status:502, headers: {'Cache-Control':'no-store'}});
  }
}
