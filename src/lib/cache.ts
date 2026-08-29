/**
 * Every read of the Google Sheet is tagged with this so a single
 * revalidateTag() call can drop the whole cached catalog at once, no matter
 * which route happened to populate it.
 */
export const CATALOG_CACHE_TAG = "catalog";

/** Routes whose output depends on the catalog and must be purged with it. */
export const CATALOG_PATHS = ["/", "/products", "/compare", "/sitemap.xml"];
