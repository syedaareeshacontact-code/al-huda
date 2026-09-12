// Public entry point for the shared SEO policy.
export { getSiteOrigin, getSiteName, toAbsoluteUrl, DEFAULT_OG_IMAGE } from './seo/site';
export { buildPageMetadata } from './seo/metadata';
export {
  buildBreadcrumbJsonLd, buildBookJsonLd, buildFaqJsonLd,
  buildOrganizationJsonLd, buildWebsiteJsonLd,
} from './seo/structured-data';
