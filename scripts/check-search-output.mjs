import assert from 'node:assert/strict';

// Read-only checks against a running production build (or an explicitly supplied deployment).
const target = new URL(process.argv[2] || 'http://127.0.0.1:3100');
const decode = value => value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#(?:39|x27);/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const locations = xml => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => decode(m[1]));
const attrs = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)=["']([^"']*)["']/g)].map(m => [m[1], decode(m[2])]));
async function get(path, redirect = 'follow') {
  const url = new URL(path, target);
  const response = await fetch(url, { redirect, headers: { 'User-Agent': 'Googlebot' }, signal: AbortSignal.timeout(60000) });
  return { response, body: await response.text() };
}

const index = await get('/sitemap.xml');
assert.equal(index.response.status, 200);
assert.match(index.body, /<sitemapindex /);
const maps = locations(index.body);
assert(maps.length > 0);
const origin = new URL(maps[0]).origin;
const allUrls = new Set();
for (const map of maps) {
  const { response, body } = await get(new URL(map).pathname);
  assert.equal(response.status, 200, map);
  assert.match(response.headers.get('content-type'), /xml/);
  const urls = locations(body);
  assert(urls.length > 0 && urls.length <= 50000, map);
  assert(!/<priority>|<changefreq>/.test(body));
  for (const url of urls) {
    const parsed = new URL(url);
    assert.equal(parsed.origin, origin);
    assert(!parsed.search && !parsed.hash, url);
    assert(!allUrls.has(url), `Duplicate sitemap URL: ${url}`);
    allUrls.add(url);
  }
}
console.log(`Validated ${maps.length} XML sitemaps and ${allUrls.size} unique URLs.`);

const paths = [...allUrls].map(url => new URL(url).pathname);
const first = pattern => { const result = paths.find(path => pattern.test(path)); assert(result, pattern); return result; };
const sample = [
  '/', '/surah', first(/^\/surah\/1-[^/]+$/), first(/^\/surah\/1-[^/]+\/ayah\/1$/),
  first(/^\/surah\/1-[^/]+\/download$/), first(/^\/tafsir\/1-[^/]+\/1$/),
  '/hadith', '/hadith/sahih-bukhari', '/hadith/sahih-bukhari/books/sahih-bukhari/1',
  '/articles', first(/^\/articles\/(?!category\/)[^/]+$/),
  '/prayer-times/lahore', '/duas/knowledge', '/mosque-finder/lahore',
];
async function checkPage(path, indexable, expectedPath = path) {
  const { response, body } = await get(path);
  assert.equal(response.status, 200, path);
  const tags = [...body.matchAll(/<(?:meta|link)\s[^>]*>/g)].map(m => attrs(m[0]));
  const canonicals = tags.filter(t => t.rel === 'canonical');
  assert.equal(canonicals.length, 1, `Canonical count: ${path}`);
  // Next can serialize the origin without a trailing slash; both denote the same root URL.
  assert.equal(new URL(canonicals[0].href).href, new URL(expectedPath, origin).href, `Canonical mismatch: ${path}`);
  const robots = tags.filter(t => t.name === 'robots' || t.name === 'googlebot');
  assert(robots.some(t => t.name === 'robots'), `Missing robots: ${path}`);
  assert(robots.every(t => /noindex/.test(t.content) === !indexable), `Indexing mismatch: ${path}`);
  assert(tags.some(t => t.name === 'description' && t.content.trim()), `Missing description: ${path}`);
  assert(!tags.some(t => t.name === 'keywords'), `Legacy keywords: ${path}`);
  assert(tags.some(t => t.property === 'og:title'), `Missing OG: ${path}`);
  assert.match(body, /<title>[^<]+<\/title>/);
  assert.match(body, /<h1[\s>]/);
  for (const match of body.matchAll(/<script\s[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) JSON.parse(match[1]);
  console.log(`Verified HTML: ${path}`);
}
for (const path of sample) await checkPage(path, true);
await checkPage('/articles?q=quran', false, '/articles');
await checkPage('/hadith/search', false, '/hadith/search');
await checkPage('/hadith/sahih-bukhari/books/sahih-bukhari?chapter=1', false, '/hadith/sahih-bukhari/books/sahih-bukhari');
await checkPage('/feedback', false);
await checkPage('/instagram', false);
const numeric = await get('/surah/1', 'manual');
assert.equal(numeric.response.status, 308);
assert.equal(new URL(numeric.response.headers.get('location'), target).pathname, first(/^\/surah\/1-[^/]+$/));
const missing = await get('/surah/999-not-a-surah');
assert.equal(missing.response.status, 404);
const robots = await get('/robots.txt');
assert.equal(robots.response.status, 200);
assert(robots.body.includes(`${origin}/sitemap.xml`));
assert(!robots.body.includes('?*q='));
console.log('Search output checks passed.');
