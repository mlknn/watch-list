const urls=['https://stockwatchlist.app/','https://stockwatchlist.app/dashboard','https://stockwatchlist.app/pricing','https://stockwatchlist.app/privacy','https://stockwatchlist.app/signup','https://stockwatchlist.app/login'];
const body=`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((loc,i)=>`  <url><loc>${loc}</loc><changefreq>${i<2?'daily':'weekly'}</changefreq><priority>${['1.0','0.9','0.8','0.5','0.6','0.4'][i]}</priority></url>`).join('\n')}
</urlset>
`;
export const dynamic='force-static';
export function GET(){
  return new Response(body,{headers:{'content-type':'application/xml; charset=utf-8','cache-control':'public, max-age=3600'}});
}
