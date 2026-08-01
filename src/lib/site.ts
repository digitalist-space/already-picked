export const SITE_NAME = "AlreadyPicked";
export const SITE_URL = "https://alreadypicked.com";
export const SITE_DESCRIPTION =
  "Practical, curated buying guides that help you compare worthwhile products and choose with confidence.";

export function brandedTitle(title: string): string {
  const cleanTitle = title
    .replace(/\s*\|\s*ThemeCart\s*$/i, "")
    .replace(/\s*\|\s*AlreadyPicked\s*$/i, "")
    .trim();
  return `${cleanTitle} | ${SITE_NAME}`;
}
