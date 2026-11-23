// Image proxy for selected MTB publishers. Restricts hosts to prevent general-purpose proxy abuse.
const hosts = [
 'pinkbike.com','pb-cdn.com','vitalmtb.com','vitalcdn.com','flowmountainbike.com',
 'enduro-mtb.com','theloamwolf.com','singletracks.com','revolutionmtb.com.au',
 'wp.com','wordpress.com','gravatar.com','cloudfront.net','imgix.net'
];
function allowed(host){return hosts.some(h => host === h || host.endsWith('.'+h));}
export default async function handler(request) {
  const raw=new URL(request.url).searchParams.get('url');
  let target;
  try {target = new URL(raw); if(target.protocol!=='https:'||!allowed(target.hostname.toLowerCase())||target.port)throw Error();}
  catch {return new Response('Image host not allowed',{status:400});}
  try {
    const res=await fetch(target.href,{headers:{'User-Agent':'Mozilla/5.0','Accept':'image/avif,image/webp,image/*,*/*;q=0.8'},signal:AbortSignal.timeout(8000),redirect:'manual'});
    const contentType=(res.headers.get('content-type')||'').split(';')[0];
    if(!res.ok || !contentType.startsWith('image/')) return new Response('Image unavailable',{status:502});
    const max=4*1024*1024;
    if(Number(res.headers.get('content-length')||0)>max)return new Response('Image too large',{status:413});
    const body=await res.arrayBuffer();
    if(body.byteLength>max)return new Response('Image too large',{status:413});
    return new Response(body,{headers:{'Content-Type':contentType,'Cache-Control':'public, max-age=86400, s-maxage=86400'}});
  } catch{return new Response('Image unavailable',{status:502});}
}
