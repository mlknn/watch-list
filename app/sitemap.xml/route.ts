const urls=[
  ['https://stockwatchlist.app/','daily','1.0'],
  ['https://stockwatchlist.app/dashboard','hourly','0.9'],
  ['https://stockwatchlist.app/compare','weekly','0.8'],
  ['https://stockwatchlist.app/open-source','monthly','0.7'],
  ['https://stockwatchlist.app/privacy','yearly','0.5'],
  ['https://stockwatchlist.app/signup','monthly','0.6'],
  ['https://stockwatchlist.app/login','monthly','0.4'],
];
const body=`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([loc,changefreq,priority])=>`  <url><loc>${loc}</loc><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`).join('\n')}
</urlset>
`;
export const dynamic='force-static';
export function GET(){
  return new Response(body,{headers:{'content-type':'application/xml; charset=utf-8','cache-control':'public, max-age=3600'}});
}
