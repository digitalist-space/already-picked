import type { Product } from "./types";
import { normalizeProductTypeLabel } from "./categoryTaxonomy.ts";

export const MAX_GUIDE_PICKS = 25;
export const BAYESIAN_MINIMUM_REVIEWS = 500;
export const BAYESIAN_PRIOR_RATING = 4.5;
export const BAYESIAN_PRICE_TIE_THRESHOLD = 0.015;
export const FUNCTIONAL_JACCARD_THRESHOLD = 0.45;
export interface CurationConfig {
  maxPicks?: number;
  maxWinnersPerCluster?: 1 | 2;
  crossBrandClustering?: boolean;
}
export type CurationRemovalReason =
  | "quality-floor" | "exact-id" | "exact-asin" | "exact-title" | "same-image"
  | "white-label-clone" | "near-identical-title" | "brand-archetype-cap" | "guide-limit";
export interface CurationRemoval {
  product: Product;
  reason: CurationRemovalReason;
  winner?: Product;
  cluster: string;
}
export interface GuideCurationReport {
  inputCount: number;
  eligibleCount: number;
  selected: Product[];
  removed: CurationRemoval[];
}
interface Fingerprint {
  brand: string;
  bucket: string;
  archetype: string;
  attributes: Set<string>;
  title: string;
  tokens: Set<string>;
  image: string;
}

const STOP_WORDS = new Set([
  "a", "an", "and", "for", "from", "gift", "gifts", "in", "new", "of", "on", "or",
  "pack", "set", "the", "to", "toy", "toys", "with", "women", "men", "kids", "adult",
  "adults", "black", "white", "blue", "green", "pink", "purple", "color", "lovers",
  "portable", "upgraded", "led", "piece", "pieces", "pcs", "item", "product",
]);
const GENERIC_BRAND_WORDS = new Set([
  "best", "book", "clip", "creative", "cute", "fidget", "handmade", "magnetic", "mini",
  "item", "product", "portable", "rechargeable", "sensory", "small", "squishy", "stress",
  "wooden",
]);

function normalize(value: unknown): string {
  return String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/\b(\d+)\s*(?:piece|pieces|pcs|pc)\b/g, "$1 pack")
    .replace(/[^a-z0-9.]+/g, " ").replace(/\s+/g, " ").trim();
}
function normalizedTitle(product: Product): string {
  return normalize(product.title).split(" ").filter((token) => !STOP_WORDS.has(token)).join(" ");
}
export function brandKey(product: Product): string {
  const specBrand = Object.entries(product.specs || {})
    .find(([key]) => normalize(key) === "brand")?.[1];
  const explicit = normalize(product.brand || specBrand);
  if (explicit) return explicit;
  const first = normalize(product.title).split(" ")[0] || "";
  return /^[a-z][a-z0-9]{2,}$/.test(first) && !GENERIC_BRAND_WORDS.has(first) ? first : "";
}
function bucket(product: Product): string {
  return normalize(normalizeProductTypeLabel(product.subcategory || product.category || "other"));
}
function attributes(product: Product): Set<string> {
  const source = normalize([product.title, product.shortHook, product.subcategory,
    ...Object.entries(product.specs || {}).flat()].join(" "));
  const result = new Set<string>();
  const patterns = [
    /\b\d+(?:\.\d+)?\s*(?:inch|in|cm|mm|ft|oz|lb|mah|w|watt|v|volt|nm|led)\b/g,
    /\b\d+\s*pack\b/g,
    /\b(?:bamboo|wood|wooden|leather|faux leather|metal|stainless steel|resin|acrylic|silicone|gel|foam|plastic|crochet|embroidered)\b/g,
    /\b(?:rechargeable|usb c|usb|battery|clip on|wearable|magnetic|slow rising|dough filled|corner|thumb|chain|charm|pendant|tassel|heart)\b/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) result.add(match[0].replace(/\s+/g, "-"));
  }
  return result;
}

export function archetype(product: Product): string {
  // Category names describe the whole guide ("NeeDoh sensory toys") and must
  // not leak into every item's form factor. Use item-level fields only.
  const text = normalize([product.title, ...Object.values(product.specs || {})].join(" "));
  if (product.category === "Desk & Coworker Stocking Stuffers") {
    if (/mug warmer|cup warmer|coffee warmer|beverage warmer|warming plate/.test(text)) {
      return "desktop-mug-warmer";
    }
    if (/cable clip|cord clip|cable holder|cord holder|cable organizer/.test(text)) {
      return "desk-cable-clips";
    }
    if (/desk vacuum|desktop vacuum|mini vacuum|keyboard vacuum/.test(text)) {
      return "mini-desk-vacuum";
    }
    if (/drawer organizer|under desk drawer|slide out storage/.test(text)) return "desk-drawer-organizer";
    if (/paper organizer|letter tray|paper sorter|file organizer/.test(text)) return "desk-paper-organizer";
    if (/desk organizer|desktop organizer|pen holder|pencil holder/.test(text)) return "desktop-pen-organizer";
    if (/sticky note|memo pad|note pad|notepad/.test(text)) return "desk-note-set";
    if (/keyboard fidget|keycap fidget/.test(text)) return "keyboard-fidget";
    if (/fidget spinner|finger spinner/.test(text)) return "fidget-spinner";
    if (/fidget cube|infinity cube/.test(text)) return "fidget-cube";
    if (/fidget pen|magnetic pen/.test(text)) return "fidget-pen";
    if (/\b(?:pen|pens)\b/.test(text)) return "desk-pen-set";
    if (/mouse ?pad|desk mat/.test(text)) return "desk-mat";
  }
  if (/book light|reading light|reading lamp/.test(text)) {
    if (/zero blue|blue light free|\b630\s*nm|red light/.test(text)) return "red-light-reading-lamp";
    if (/neck|wearable|hands free/.test(text)) return "wearable-neck-reading-light";
    if (/clip|rechargeable|\busb\b/.test(text)) return "clip-on-rechargeable-book-light";
    if (/\b(?:desk|table|standing)\b/.test(text)) return "desk-reading-lamp";
    return "portable-reading-light";
  }
  if (/page holder|thumb holder|thumb ring/.test(text)) {
    return /wood|bamboo/.test(text) ? "wooden-thumb-page-holder" : "thumb-page-holder";
  }
  if (/bookmark/.test(text)) {
    if (/leather/.test(text) && /heart/.test(text)) {
      return "leather-heart-corner-bookmark";
    }
    if (/metal|stainless steel/.test(text) && /chain|charm|pendant|tassel/.test(text)) {
      return "metal-chain-charm-bookmark";
    }
    if (/corner/.test(text) && /embroider|fabric|felt/.test(text)) return "embroidered-corner-bookmark";
    if (/magnetic/.test(text)) return "magnetic-bookmark";
    if (/metal/.test(text)) return "metal-bookmark";
    return "bookmark";
  }
  if (/annotation|sticky tab|page tab|highlighter/.test(text)) return "reading-annotation-kit";
  if (/stress cube|squishy cube|nice cube|ice cube/.test(text)) return "slow-rising-stress-cube";
  if (/axolotl/.test(text) && /squish|squeeze|stress|fidget/.test(text)) return "axolotl-squishy";
  if (/stress ball|squeeze ball|squishy ball/.test(text)) {
    if (/magnetic/.test(text)) return "magnetic-fidget-balls";
    if (/water bead|gel|memory gel/.test(text)) return "gel-stress-ball";
    return "standard-stress-ball";
  }
  if (/sensory bottle/.test(text)) return "sensory-bottle";
  if (/fidget tube/.test(text)) return "sensory-fidget-tube";
  if (/sensory maze|gel maze/.test(text)) return "gel-sensory-maze";
  if (/needoh|dough filled/.test(text)) return "dough-filled-squishy";
  if (/squish|squeeze|slow rising/.test(text)) return "novelty-squishy";
  if (/lego/.test(text)) {
    if (/minifigure|mini figure/.test(text)) return "lego-minifigure";
    if (/keychain|key chain/.test(text)) return "lego-keychain";
    if (/brickheadz/.test(text)) return "lego-brickheadz";
    if (/polybag/.test(text)) return "lego-polybag";
    return "lego-building-set";
  }
  if (/mini bricks|micro blocks|building blocks|building brick/.test(text)) {
    return "mini-building-block-kit";
  }
  return bucket(product);
}
function semanticTokens(product: Product): Set<string> {
  const brand = new Set(brandKey(product).split(" "));
  return new Set(normalize([
    product.title,
    product.shortHook,
    ...Object.values(product.specs || {}),
  ].join(" ")).split(" ").filter((token) =>
    token.length > 1 && !/^\d+(?:\.\d+)?$/.test(token) &&
    !STOP_WORDS.has(token) && !brand.has(token)
  ));
}
export function functionalTokens(product: Product): Set<string> {
  const result = semanticTokens(product);
  const type = archetype(product);
  if (type !== bucket(product)) {
    for (const token of type.split("-")) {
      if (token.length > 1 && !STOP_WORDS.has(token)) result.add(token);
    }
  }
  for (const token of attributes(product)) {
    if (!/^\d/.test(token) && !/\d+-pack$/.test(token)) result.add(token);
  }
  return result;
}
function imageKey(product: Product): string {
  const value = String(product.imageUrl || "").trim().toLowerCase();
  if (!value || value.includes("placeholder")) return "";
  try {
    const path = new URL(value).pathname;
    return path.split("/").pop()?.replace(/\._[^/]+(?=\.[a-z0-9]+$)/i, "") || "";
  } catch {
    return value.replace(/[?#].*$/, "").split("/").pop()
      ?.replace(/\._[^/]+(?=\.[a-z0-9]+$)/i, "") || "";
  }
}
function fingerprint(product: Product): Fingerprint {
  return { brand: brandKey(product), bucket: bucket(product), archetype: archetype(product),
    attributes: attributes(product), title: normalizedTitle(product), tokens: functionalTokens(product),
    image: imageKey(product) };
}
function similarity(left: Set<string>, right: Set<string>) {
  if (!left.size || !right.size) return { jaccard: 0, containment: 0 };
  let intersection = 0;
  for (const token of left) if (right.has(token)) intersection++;
  return { jaccard: intersection / (left.size + right.size - intersection),
    containment: intersection / Math.min(left.size, right.size) };
}
function clusterReason(left: Product, right: Product, a: Fingerprint, b: Fingerprint,
  crossBrandClustering: boolean):
  CurationRemovalReason | null {
  if (String(left.id) === String(right.id)) return "exact-id";
  if (left.asin && right.asin && left.asin.toUpperCase() === right.asin.toUpperCase()) return "exact-asin";
  if (a.title && a.title === b.title) return "exact-title";
  if (a.image && a.image === b.image) return "same-image";
  if (a.bucket !== b.bucket) return null;
  const sameKnownBrand = Boolean(a.brand && b.brand && a.brand === b.brand);
  if (!sameKnownBrand && !crossBrandClustering) return null;
  const title = similarity(a.tokens, b.tokens);
  const specs = similarity(a.attributes, b.attributes);
  const tightArchetypes = new Set([
    "desktop-mug-warmer", "desk-cable-clips", "mini-desk-vacuum", "desk-note-set",
    "desk-pen-set", "desk-drawer-organizer", "desk-paper-organizer",
    "desktop-pen-organizer", "keyboard-fidget", "fidget-spinner", "fidget-cube",
    "fidget-pen",
  ]);
  if (a.archetype === b.archetype && tightArchetypes.has(a.archetype)) {
    return "white-label-clone";
  }
  if (a.archetype === b.archetype && a.archetype !== a.bucket &&
    specs.containment >= 0.5) {
    return "white-label-clone";
  }
  if (title.jaccard >= FUNCTIONAL_JACCARD_THRESHOLD) {
    return "white-label-clone";
  }
  if (Math.min(a.tokens.size, b.tokens.size) >= 3 && title.containment >= 0.72) {
    return "near-identical-title";
  }
  if (a.tokens.size >= 4 && b.tokens.size >= 4 &&
    title.jaccard >= 0.76 && title.containment >= 0.84) return "near-identical-title";
  return null;
}

export function confidence(product: Product): number {
  const reviews = Math.max(0, product.reviewCount || 0);
  return (reviews * product.rating + BAYESIAN_MINIMUM_REVIEWS * BAYESIAN_PRIOR_RATING) /
    (reviews + BAYESIAN_MINIMUM_REVIEWS);
}
function metadataCompleteness(product: Product): number {
  return [
    product.title,
    product.description,
    product.asin,
    product.category,
    product.subcategory,
    product.shortHook,
    imageKey(product),
    Object.keys(product.specs || {}).length ? "specs" : "",
  ].filter(Boolean).length;
}
function compare(left: Product, right: Product): number {
  const leftEstablished = left.reviewCount >= BAYESIAN_MINIMUM_REVIEWS;
  const rightEstablished = right.reviewCount >= BAYESIAN_MINIMUM_REVIEWS;
  const leftUltraLow = left.reviewCount < 50;
  const rightUltraLow = right.reviewCount < 50;
  if (leftEstablished && rightUltraLow) return -1;
  if (rightEstablished && leftUltraLow) return 1;
  const delta = confidence(right) - confidence(left);
  if (Math.abs(delta) <= BAYESIAN_PRICE_TIE_THRESHOLD) {
    return left.price - right.price ||
      metadataCompleteness(right) - metadataCompleteness(left) ||
      right.reviewCount - left.reviewCount || delta ||
      String(left.id).localeCompare(String(right.id));
  }
  return delta || right.reviewCount - left.reviewCount ||
    metadataCompleteness(right) - metadataCompleteness(left) || left.price - right.price ||
    String(left.id).localeCompare(String(right.id));
}
const ARCHETYPE_LABELS: Record<string, string> = {
  "desktop-mug-warmer": "Best desktop mug warmer",
  "desk-cable-clips": "Best cable-management clips",
  "mini-desk-vacuum": "Best mini desk vacuum",
  "desk-note-set": "Best sticky-note set",
  "desk-pen-set": "Best coworker pen set",
  "desk-drawer-organizer": "Best desk-drawer organizer",
  "desk-paper-organizer": "Best paper organizer",
  "desktop-pen-organizer": "Best desktop supply organizer",
  "desk-mat": "Best desk mat",
  "keyboard-fidget": "Best keyboard fidget",
  "fidget-spinner": "Best fidget spinner",
  "fidget-cube": "Best fidget cube",
  "fidget-pen": "Best fidget pen",
  "red-light-reading-lamp": "Best red-light reading lamp",
  "wearable-neck-reading-light": "Best neck reading light",
  "clip-on-rechargeable-book-light": "Best clip-on book light",
  "desk-reading-lamp": "Best desk reading lamp",
  "portable-reading-light": "Best portable reading light",
  "wooden-thumb-page-holder": "Best wooden page holder",
  "thumb-page-holder": "Best one-handed page holder",
  "leather-heart-corner-bookmark": "Best leather corner bookmark",
  "metal-chain-charm-bookmark": "Best chain-charm bookmark",
  "embroidered-corner-bookmark": "Best embroidered bookmark",
  "magnetic-bookmark": "Best magnetic bookmarks",
  "metal-bookmark": "Best metal bookmark",
  bookmark: "Best classic bookmark",
  "reading-annotation-kit": "Best reading annotation kit",
  "slow-rising-stress-cube": "Best slow-rising stress cube",
  "axolotl-squishy": "Best axolotl squishy",
  "magnetic-fidget-balls": "Best magnetic fidget balls",
  "gel-stress-ball": "Best gel stress ball",
  "standard-stress-ball": "Best classic stress ball",
  "sensory-bottle": "Best sensory bottle",
  "sensory-fidget-tube": "Best sensory fidget tubes",
  "gel-sensory-maze": "Best gel sensory maze",
  "dough-filled-squishy": "Best dough-filled squishy",
  "novelty-squishy": "Best novelty squishy",
  "lego-minifigure": "Best LEGO minifigure gift",
  "lego-keychain": "Best LEGO keychain",
  "lego-brickheadz": "Best LEGO BrickHeadz set",
  "lego-polybag": "Best LEGO polybag",
  "lego-building-set": "Best LEGO building set",
  "mini-building-block-kit": "Best mini building-block kit",
};

function titleEditorialLabel(product: Product): string {
  const text = normalize(`${product.title} ${product.shortHook || ""}`);
  if (/coaster/.test(text) && /desk|office|coworker/.test(text)) return "Best office drink coaster";
  if (/phone stand|phone holder/.test(text)) return "Best desktop phone stand";
  if (/keyboard cleaner|cleaning gel|screen cleaner/.test(text)) return "Best desk cleaning tool";
  if (/sticker/.test(text) && /kindle|journal|reading/.test(text)) {
    return "Best Kindle & journal stickers";
  }
  if (/\b(?:pen|pens)\b/.test(text) && /book|quote|reader/.test(text)) {
    return "Best bookish quote pens";
  }
  if (/tote|canvas bag/.test(text) && /book|reader/.test(text)) return "Best book-lover tote";
  if (/journal|reading tracker|book tracker/.test(text)) return "Best reading journal";
  if (/coaster/.test(text) && /book|library|reading/.test(text)) return "Best library-themed coasters";
  if (/coaster/.test(text) && /wood|wooden/.test(text)) return "Best wooden coasters";
  if (/ornament|suncatcher|sun catcher/.test(text) && /book|reader|library/.test(text)) {
    return "Best bookish ornament";
  }
  if (/tea|english breakfast/.test(text) && /book|literary|quote/.test(text)) {
    return "Best literary tea gift";
  }
  if (/sock/.test(text) && /book|reader|writer/.test(text)) return "Best book-lover socks";
  if (/\bmug\b|\bcup\b|tumbler/.test(text) && /book|reader|library/.test(text)) {
    return "Best bookish drinkware";
  }
  if (/acrylic|paperweight|desk sign/.test(text) && /book|reader|library/.test(text)) {
    return "Best reader desk keepsake";
  }
  if (/book lover|bookworm|reader gift/.test(text)) return "Best book-lover keepsake";
  return "";
}

function fallbackEditorialLabel(product: Product): string {
  const type = normalize(`${product.category} ${product.subcategory || ""}`);
  if (/desk coworker stocking stuffers/.test(type)) {
    if (/stress relief fidgets/.test(type)) return "Best desk fidget";
    if (/drinkware mug warmers/.test(type)) return "Best coworker drinkware gift";
    if (/notepads pens desk humor/.test(type)) return "Best office-humor gift";
    return "Best desk accessory";
  }
  if (/iphone duo/.test(type)) return "Best iPhone Duo case";
  if (/wallet style iphone/.test(type)) return "Best iPhone wallet case";
  if (/bag charm/.test(type)) return "Best personalized bag charm";
  if (/compact card/.test(type)) return "Best compact card game";
  if (/crochet flowers|crochet plants/.test(type)) return "Best crochet plant gift";
  if (/crochet food|crochet novelty/.test(type)) return "Best crochet novelty gift";
  if (/crochet holiday/.test(type)) return "Best crochet holiday gift";
  if (/crochet animal/.test(type)) return "Best crochet animal gift";
  if (/crochet|mini craft/.test(type)) return "Best mini craft kit";
  if (/cotton|woven coaster/.test(type)) return "Best woven drink coaster";
  if (/wooden natural coaster/.test(type)) return "Best wooden coaster";
  if (/coaster/.test(type)) return "Best drink coaster";
  if (/glass upright incense/.test(type)) return "Best glass incense holder";
  if (/wooden bamboo incense/.test(type)) return "Best wooden incense holder";
  if (/metal specialty incense/.test(type)) return "Best metal incense holder";
  if (/incense holder/.test(type)) return "Best incense holder";
  if (/needoh|sensory/.test(type)) return "Best sensory toy";
  if (/plush|school classroom/.test(type)) return "Best plush bag charm";
  if (/reading light/.test(type)) return "Best reading light";
  if (/small lego/.test(type)) return "Best LEGO building set";
  if (/small puzzle|brainteaser/.test(type)) return "Best pocket brainteaser";
  return "Best editor's pick";
}

const QUALIFIERS: ReadonlyArray<[RegExp, string]> = [
  [/personalized|custom name|initial/, "personalized"],
  [/photo|picture/, "photo"],
  [/engraved/, "engraved"],
  [/magsafe|magnetic/, "magnetic"],
  [/wallet|card holder|card slot/, "wallet"],
  [/kickstand|\bstand\b/, "stand"],
  [/clear|transparent/, "clear"],
  [/rugged|shockproof|heavy duty|hinge protection/, "rugged"],
  [/slim|thin/, "slim"],
  [/wood|wooden|bamboo|rosewood/, "wooden"],
  [/leather/, "leather"],
  [/metal|stainless steel/, "metal"],
  [/glass|ceramic/, "glass"],
  [/cotton|woven|macrame/, "woven"],
  [/floral|flower|botanical/, "floral"],
  [/cat|dog|animal|frog|turtle|axolotl|chicken|bear|duck/, "animal-themed"],
  [/holiday|christmas|ornament|snowman/, "holiday"],
  [/travel|portable|pocket/, "travel"],
  [/beginner|starter/, "beginner"],
  [/funny|humor|joke/, "funny"],
  [/inspirational|positive|affirmation/, "inspirational"],
];

function addQualifier(label: string, qualifier: string): string {
  const noun = label.replace(/^(?:Best|Most popular)\s+/i, "");
  const nounTokens = new Set(normalize(noun).split(" "));
  const qualifierTokens = normalize(qualifier).split(" ");
  if (qualifierTokens.some((token) => nounTokens.has(token))) return label;
  const materials = new Set(["wooden", "leather", "metal", "glass", "woven"]);
  if (qualifierTokens.some((token) => materials.has(token)) &&
      [...nounTokens].some((token) => materials.has(token))) return label;
  return `Best ${qualifier} ${noun}`;
}

function withQualifier(label: string, product: Product, group: Product[]): string {
  const text = normalize(product.title);
  for (const [pattern, qualifier] of QUALIFIERS) {
    if (pattern.test(text)) {
      const qualified = addQualifier(label, qualifier);
      if (qualified !== label) return qualified;
    }
  }
  if (product.price === Math.min(...group.map((item) => item.price))) {
    return addQualifier(label, "budget");
  }
  if (product.reviewCount === Math.max(...group.map((item) => item.reviewCount))) {
    return `Most popular ${label.replace(/^Best\s+/i, "")}`;
  }
  return label;
}

function compactLabel(label: string): string {
  const deduped = label
    .replace(/\b(\w[\w-]*)\s+\1\b/gi, "$1")
    .replace(/^Best\s+(?:best\s+)+/i, "Best ")
    .replace(/\s+/g, " ")
    .trim();
  if (deduped.length <= 35) return deduped;
  const shortened = deduped
    .replace("personalized", "custom")
    .replace("book-lover", "reader")
    .replace("building-block", "brick")
    .replace("animal-themed", "animal")
    .replace("space-saving", "compact")
    .replace("gift-ready", "gift")
    .replace("inspirational", "uplifting")
    .replace("lightweight", "light")
    .replace("decorative", "decor")
    .replace("portable reading light", "reading light")
    .replace("personalized bag charm", "custom bag charm")
    .replace("Most popular", "Popular");
  if (shortened.length <= 35) return shortened;
  return shortened.slice(0, 35).replace(/\s+\S*$/, "").trimEnd();
}

function productBrandLabel(product: Product): string {
  const explicit = String(product.brand || "").trim();
  if (explicit && explicit.length <= 14 && /^[\p{L}\p{N}][\p{L}\p{N} '&.-]*$/u.test(explicit)) {
    return explicit;
  }
  return "";
}

const DISTINCT_ANGLES = [
  "budget", "compact", "gift-ready", "everyday", "premium", "colorful", "minimalist",
  "playful", "classic", "modern", "versatile", "travel", "starter", "collector",
  "space-saving", "durable", "lightweight", "decorative", "hands-on", "creative",
  "family", "desk-friendly", "easy-care", "cozy", "novelty", "traditional",
  "statement", "simple", "deluxe", "casual",
];

function uniqueEditorialLabel(product: Product, group: Product[], used: Set<string>): string {
  const base = editorialBestFor(product);
  const candidates = [base, withQualifier(base, product, group)];
  const brand = productBrandLabel(product);
  if (brand) candidates.push(addQualifier(base, brand));
  for (const angle of DISTINCT_ANGLES) candidates.push(addQualifier(base, angle));
  for (const candidate of candidates) {
    const compact = compactLabel(candidate);
    if (!used.has(compact)) return compact;
  }
  throw new Error(`Could not create a distinct editorial label for product ${product.id}`);
}

export function editorialBestFor(product: Product): string {
  const typeLabel = ARCHETYPE_LABELS[archetype(product)];
  return compactLabel(
    typeLabel ||
    titleEditorialLabel(product) ||
    fallbackEditorialLabel(product)
  );
}
function eligible(product: Product): boolean {
  return Number.isFinite(product.price) && product.price > 0 &&
    Number.isFinite(product.reviewCount) && product.reviewCount >= 5 &&
    Number.isFinite(product.rating) && product.rating >= 3.8;
}

export function curateGuideWithReport(products: Product[],
  options: CurationConfig = {}): GuideCurationReport {
  const maxPicks = Math.max(1, Math.min(options.maxPicks ?? MAX_GUIDE_PICKS, MAX_GUIDE_PICKS));
  const maxWinnersPerCluster = options.maxWinnersPerCluster ?? 1;
  const crossBrandClustering = options.crossBrandClustering ?? true;
  const removed: CurationRemoval[] = [];
  const eligibleCandidates = products.filter((product) => {
    if (eligible(product)) return true;
    removed.push({ product, reason: "quality-floor", cluster: archetype(product) });
    return false;
  }).sort(compare);
  const candidates: Product[] = [];
  const exactIds = new Map<string, Product>();
  const exactAsins = new Map<string, Product>();
  const exactTitles = new Map<string, Product>();
  const exactImages = new Map<string, Product>();
  for (const product of eligibleCandidates) {
    const id = String(product.id);
    const asin = product.asin?.toUpperCase() || "";
    const title = normalizedTitle(product);
    const image = imageKey(product);
    const winner = exactIds.get(id) || (asin ? exactAsins.get(asin) : undefined) ||
      (title ? exactTitles.get(title) : undefined) || (image ? exactImages.get(image) : undefined);
    if (winner) {
      const reason: CurationRemovalReason = exactIds.has(id) ? "exact-id" :
        asin && exactAsins.has(asin) ? "exact-asin" :
        title && exactTitles.has(title) ? "exact-title" : "same-image";
      removed.push({ product, reason, winner, cluster: archetype(winner) });
      exactIds.set(id, winner);
      if (asin) exactAsins.set(asin, winner);
      if (title) exactTitles.set(title, winner);
      if (image) exactImages.set(image, winner);
      continue;
    }
    candidates.push(product);
    exactIds.set(id, product);
    if (asin) exactAsins.set(asin, product);
    if (title) exactTitles.set(title, product);
    if (image) exactImages.set(image, product);
  }
  const fingerprints = new Map(candidates.map((product) => [product, fingerprint(product)]));
  const groups: Product[][] = [];
  for (const product of candidates) {
    // Greedy leader clustering is deliberately non-transitive: a marginal
    // A≈B≈C chain cannot merge two products whose leaders are not similar.
    const matching = groups.find((group) => clusterReason(
      product, group[0], fingerprints.get(product)!, fingerprints.get(group[0])!,
      crossBrandClustering
    ) !== null);
    if (!matching) groups.push([product]);
    else matching.push(product);
  }
  const selected: Product[] = [];
  const usedReasons = new Set<string>();
  for (const group of groups.map((item) => item.sort(compare)).sort((a, b) => compare(a[0], b[0]))) {
    const winners = group.filter((candidate, index, all) => {
      if (index === 0) return true;
      if (maxWinnersPerCluster === 1) return false;
      const prior = all.slice(0, index).filter((item) => item === group[0]);
      const sameBrand = prior.some((item) => brandKey(item) &&
        brandKey(item) === brandKey(candidate));
      const distinctUseCase = archetype(candidate) !== archetype(group[0]);
      return !sameBrand && distinctUseCase;
    }).slice(0, maxWinnersPerCluster);
    if (selected.length >= maxPicks) {
      for (const product of group) removed.push({ product, reason: "guide-limit",
        cluster: archetype(product) });
      continue;
    }
    for (const winner of winners) {
      if (selected.length >= maxPicks) break;
      const reason = uniqueEditorialLabel(winner, group, usedReasons);
      usedReasons.add(reason);
      selected.push({ ...winner, bestFor: reason });
    }
    for (const product of group) {
      if (winners.includes(product)) continue;
      const winner = winners[0];
      removed.push({ product,
        reason: clusterReason(product, winner, fingerprints.get(product)!,
          fingerprints.get(winner)!, crossBrandClustering) || "white-label-clone",
        winner, cluster: archetype(winner) });
    }
  }
  return { inputCount: products.length, eligibleCount: eligibleCandidates.length, selected, removed };
}
export function curateGuide(products: Product[], options: CurationConfig = {}): Product[] {
  return curateGuideWithReport(products, options).selected;
}
