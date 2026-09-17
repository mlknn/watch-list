const key = 'be798144d0d664b57c9868c47643a58c';
const urls = [
  'https://stockwatchlist.app/',
  'https://stockwatchlist.app/dashboard',
  'https://stockwatchlist.app/compare',
  'https://stockwatchlist.app/open-source',
  'https://stockwatchlist.app/privacy',
  'https://stockwatchlist.app/signup',
  'https://stockwatchlist.app/login',
  'https://stockwatchlist.app/llms.txt',
  'https://stockwatchlist.app/sitemap.xml',
];

const body = JSON.stringify({
  host: 'stockwatchlist.app',
  key,
  keyLocation: `https://stockwatchlist.app/${key}.txt`,
  urlList: urls,
});

const indexNow = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: {'Content-Type': 'application/json; charset=utf-8'},
  body,
});
const bingSitemap = await fetch(`https://www.bing.com/ping?sitemap=${encodeURIComponent('https://stockwatchlist.app/sitemap.xml')}`);
const googleSitemap = await fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent('https://stockwatchlist.app/sitemap.xml')}`);
console.log(JSON.stringify({
  indexNow: indexNow.status,
  bingSitemap: bingSitemap.status,
  googleSitemap: googleSitemap.status,
}, null, 2));
if (!indexNow.ok) process.exit(1);
