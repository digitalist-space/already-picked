export const GIFTS_AND_STOCKING_STUFFERS = "Gifts & Stocking Stuffers";
export const DESK_GIFT_SUBCATEGORIES = [
  "Desk Organizers & Cable Clips",
  "Stress Relief & Fidgets",
  "Drinkware & Mug Warmers",
  "Notepads, Pens & Desk Humor",
] as const;

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

export function normalizeDeskGiftSubcategory(title: string, subcategory = ""): string {
  const text = `${title} ${subcategory}`.toLowerCase();
  if (/organizer|pen holder|pencil holder|letter tray|cable|cord clip|desk vacuum|desktop vacuum/.test(text)) {
    return "Desk Organizers & Cable Clips";
  }
  if (/mug warmer|cup warmer|coffee warmer|candle warmer|\bmug\b|tumbler|drink coaster|\bcoaster/.test(text)) {
    return "Drinkware & Mug Warmers";
  }
  if (/stress|fidget|squish|putty|sensory|squeeze|spinner|pop[ -]?it|desk toy|magnet(?:ic)? (?:ball|ring)|kinetic|infinity cube/.test(text)) {
    return "Stress Relief & Fidgets";
  }
  if (/notepad|note pad|sticky note|memo|journal|\bpen\b|\bpens\b|pencil|marker|highlighter|desk humor|office humor|sarcas|joke|funny|gag gift|greeting card/.test(text)) {
    return "Notepads, Pens & Desk Humor";
  }
  return "Desk Organizers & Cable Clips";
}

export function isDeskGiftRelevant(title: string): boolean {
  const text = title.toLowerCase();
  if (/sock|beanie|hat\b|bracelet|necklace|keychain|back scratcher|pillow|bumper sticker|window decal/.test(text)) {
    return false;
  }
  return /desk|office|coworker|employee|mug|cup warmer|coffee warmer|candle warmer|coaster|organizer|cable|cord clip|vacuum|sticky note|memo|notepad|journal|\bpen\b|\bpens\b|pencil|marker|highlighter|mouse ?pad|desk mat|phone stand|fidget|stress|sensory|squish|spinner|putty|affirmation card|decision dice|dad joke/.test(text);
}
