export const SITE_NAME = "AlreadyPicked";
// Must match the host the site actually serves from: the apex domain 301s
// to www, so canonical tags, robots.txt and the sitemap all use www too.
// Changing this without changing the Vercel primary domain will point
// every canonical at a redirect again.
export const SITE_URL = "https://www.alreadypicked.com";
export const SITE_DESCRIPTION =
  "Practical, curated buying guides that help you compare worthwhile products and choose with confidence.";

export function brandedTitle(title: string): string {
  const cleanTitle = title
    .replace(/\s*\|\s*ThemeCart\s*$/i, "")
    .replace(/\s*\|\s*AlreadyPicked\s*$/i, "")
    .trim();
  return `${cleanTitle} | ${SITE_NAME}`;
}
