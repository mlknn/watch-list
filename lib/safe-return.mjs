/** Keep return links on this site. Reject protocol-relative and off-site URLs. */

export function safeReturnPath(value, fallback='/dashboard'){
  const raw=String(value||'').trim();
  if(!raw.startsWith('/')||raw.startsWith('//')||raw.includes('://'))return fallback;
  if(raw.includes('\\')||[...raw].some(ch=>ch.charCodeAt(0)<32))return fallback;
  return raw;
}

export function stockHref(symbol, from){
  const path='/stocks/'+encodeURIComponent(symbol);
  if(!from)return path;
  return path+'?from='+encodeURIComponent(from);
}
