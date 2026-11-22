export const GIFTS_AND_STOCKING_STUFFERS = "Gifts & Stocking Stuffers";

const PRODUCT_TYPE_ALIASES = new Map<string, string>([
  ["reading lights", "Book Lights"],
  ["book lights", "Book Lights"],
  ["page holders", "Bookmarks & Page Holders"],
  ["bookmarks & page holders", "Bookmarks & Page Holders"],
  ["cleaning cloths and towels", "Cleaning Cloths & Towels"],
  ["cleaning cloths & towels", "Cleaning Cloths & Towels"],
  ["coasters and table decor", "Coasters & Table Decor"],
  ["coasters & table decor", "Coasters & Table Decor"],
  ["trays bowls and baskets", "Trays, Bowls & Baskets"],
  ["trays, bowls & baskets", "Trays, Bowls & Baskets"],
]);

export function normalizeProductTypeLabel(label: string): string {
  const trimmed = label.trim().replace(/\s+/g, " ");
  const normalized = trimmed
    .replace(/\s+and\s+/gi, " & ")
    .toLocaleLowerCase();
  return PRODUCT_TYPE_ALIASES.get(normalized) || trimmed;
}
