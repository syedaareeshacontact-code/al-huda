# Search implementation

This rebuild replaces the former keyword-generation layer and count-based sitemap implementation. It does not establish why historical Google traffic dropped, certify editorial review, or guarantee ranking recovery. Search Console data and a post-deployment check are still required for those operational questions.

## Page metadata

- `src/lib/seo/site.ts` owns the public origin and site identity. Origins with credentials, query strings or path suffixes are rejected.
- `src/lib/seo/metadata.ts` describes each visible page and creates its canonical, robots directives and sharing metadata. Canonicals exclude query strings and fragments. Article authors, cover images and real publication/update dates use this same builder.
- The root layout supplies defaults but no inherited homepage canonical. Public content keeps its existing canonical URLs. Quran legacy redirects remain available.
- There are no generated meta-keyword lists. Article frontmatter keywords still power the site's own article search; they are not emitted as SEO keywords.
- Search, filtered article views, filtered/paginated Hadith lists, feedback and the Instagram campaign landing page are noindex. Account utility pages remain noindex. Robots allows crawling of these pages so crawlers can read that directive.
- No language alternates are claimed without separate localized pages. The interface remains English, with Arabic/Urdu content in their existing components.

## Content and structured data

The Surah, Tafseer and download descriptions use verifiable chapter facts and actual functionality. The former unsourced recitation-benefit introductions have been removed. Quran text and source translations have not been rewritten. Downloads state that a free account is required.

`src/lib/seo/structured-data.ts` is the common JSON-LD serializer. It escapes script delimiters while preserving the text after JSON parsing. Quran references and Hadith narrations use CreativeWork; original editorial articles retain Article. FAQ markup reflects visible questions and does not promise a Google rich result. Site and publisher entities have stable IDs. Unused local-business, voice-search and other schema builders have been removed.

If the Quran provider returns an incomplete chapter, the server throws instead of caching an empty indexable reader. This intentionally makes an unavailable required source a build/revalidation error.

## Sitemap publication

The main endpoint remains `/sitemap.xml`. All advertised XML pages are generated from `src/lib/seo/search-catalog.ts`; individual route handlers do not fetch providers or independently calculate coverage.

Sources:

| Section | Discovery source |
| --- | --- |
| Public pages | Explicit published routes |
| Quran and verses | The validated 114-Surah index and defined Quran verse counts |
| Tafseer | Existing per-Ayah availability snapshot |
| Downloads | Public Surah download landing pages, not protected file URLs |
| Hadith | Unique readable identifiers extracted from the stored Hadith source records |
| Articles | Validated MDX and its actual categories/update dates |
| Tools | Configured city coordinates and a verified Dua discovery snapshot |

`search-policy.ts` rejects duplicates, query/fragment URLs, private/search destinations and invalid/future modification dates. Unavailable or noindex records are excluded. Each section is split into at most 2,000 records per XML file. The split size is operational, not a ranking signal.

Hadith discovery deliberately does not infer identifiers from `hadiths_count`. The source has numbering gaps and repeated identifiers. `scripts/build-hadith-catalog.mjs` extracts actual numbers, compresses only verified consecutive numbers into ranges, and records a SHA-256 hash for each source file. `npm run build` first verifies that the compact catalog still matches its seven source files. A stale or incomplete catalog fails the build before publication.

The checked-in Dua catalog contains category IDs whose content was successfully fetched, plus names-directory availability. `checkedAt` is a verification timestamp, not an invented content-update date, and is not emitted as `lastmod`. A failed refresh does not modify the existing snapshot.

Only article content/category update dates currently produce `lastmod`. There are no generated daily timestamps, `priority` or `changefreq` values. Sitemap requests use committed snapshots, so a provider outage cannot publish a truncated replacement. Snapshots still need deliberate refresh when source content changes; their inclusion is evidence of discovery, not a guarantee every live API response is available forever.

The articles/tools/Hadith compatibility sitemap endpoints now point into the shared registry. Retired chunk names redirect to the main index where they no longer match a current page. Unknown names return 404. Removing a URL from a sitemap does not itself deindex it.

## Refresh and validation

1. Use `npm run data:refresh-surahs` / `npm run data:refresh-tafsir` only when refreshing those source datasets; inspect the resulting diff.
2. After changing the stored Hadith dataset, run `npm run data:inspect-hadiths`. Review its JSON and replace `src/data/hadith-catalog.json` with the reviewed snapshot. The generator prints output and does not overwrite the file itself.
3. Run `npm run data:inspect-duas` to fetch and validate all category content and the names directory. Review the resulting JSON before updating `src/data/dua-catalog.json`.
4. Run `npm run seo:check`, `npm test`, and `npm run build`. `npm run build:seo` combines the SEO checks and production build; it no longer refreshes remote datasets or generates PDFs implicitly.
5. Start the built app with `npm start -- --port 3100`, then run `npm run seo:smoke`. A different running origin can be passed as `npm run seo:smoke -- https://example.com`.

The smoke check downloads every advertised sitemap, verifies unique canonical URLs and checks representative rendered pages for title, description, canonical, indexing directives, sharing metadata, valid JSON-LD, redirects and missing-content status. It samples HTML; it does not fetch every Hadith page or certify religious accuracy.

## Deployment and measurement

Deploy through the normal project workflow, rerun the smoke check on the public origin, and submit `/sitemap.xml` in Search Console. Compare page-family impressions/clicks with the pre-change period. Preserve existing public URLs and review any future merges/removals individually.

The ten existing editorial articles retain their visible scholarly-review status. Pending review must not be changed to approved without an actual qualified review. No Search Console action, deployment or external review is performed by these scripts.

Official references: [Google sitemap documentation](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing), [AI content guidance](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content).

## Verification recorded on 12 September 2026

- SEO suite: 41 tests passed; full suite: 182 tests in 35 files passed.
- Production build: 570 static pages generated successfully; TypeScript passed.
- ESLint passed for the changed application/SEO code and verification scripts; `git diff --check` passed.
- Production HTTP smoke test on localhost: 34 XML sitemaps, 53,131 unique canonical URLs, and 19 representative HTML pages passed, including noindex variants, numeric Surah redirects and an invalid Surah 404.
- All seven stored Hadith source files matched their discovery-catalog hashes. The catalog contains 40,172 unique readable Hadith identifiers. All 27 Dua categories and the names directory were fetched when preparing their discovery snapshot.
- This is local production-build verification. The public deployment, Search Console submission, traffic recovery and pending scholarly reviews have not been performed or verified by this change.
