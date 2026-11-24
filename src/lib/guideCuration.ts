import type { Product } from "./types";
import { normalizeProductTypeLabel } from "./categoryTaxonomy.ts";

export const MAX_GUIDE_PICKS = 25;
export type CurationRemovalReason =
  | "quality-floor" | "exact-asin" | "exact-title" | "same-image"
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
  "adults", "black", "white", "blue", "green", "pink", "purple", "color",
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
  const source = normalize([product.title, product.subcategory,
    ...Object.entries(product.specs || {}).flat()].join(" "));
  const result = new Set<string>();
  const patterns = [
    /\b\d+(?:\.\d+)?\s*(?:inch|in|cm|mm|ft|oz|lb|mah|w|watt|v|volt|nm|led)\b/g,
    /\b\d+\s*pack\b/g,
    /\b(?:bamboo|wood|wooden|metal|silicone|gel|foam|plastic|crochet|embroidered)\b/g,
    /\b(?:rechargeable|usb c|usb|battery|clip on|wearable|magnetic|slow rising|dough filled)\b/g,
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
  if (/book light|reading light|reading lamp/.test(text)) {
    if (/zero blue|blue light free|\b630\s*nm|red light/.test(text)) return "red-light-reading-lamp";
    if (/neck|wearable|hands free/.test(text)) return "wearable-neck-reading-light";
    if (/clip|rechargeable|\busb\b/.test(text)) return "clip-on-rechargeable-book-light";
    if (/desk|table|standing/.test(text)) return "desk-reading-lamp";
    return "portable-reading-light";
  }
  if (/page holder|thumb holder|thumb ring/.test(text)) {
    return /wood|bamboo/.test(text) ? "wooden-thumb-page-holder" : "thumb-page-holder";
  }
  if (/bookmark/.test(text)) {
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
function tokens(product: Product): Set<string> {
  const brand = new Set(brandKey(product).split(" "));
  return new Set(normalizedTitle(product).split(" ")
    .filter((token) => token.length > 1 && !brand.has(token)));
}
function imageKey(product: Product): string {
  const value = String(product.imageUrl || "").trim().toLowerCase();
  return !value || value.includes("placeholder") ? "" :
    value.replace(/[?#].*$/, "").replace(/\._[^/]+(?=\.[a-z0-9]+$)/i, "");
}
function fingerprint(product: Product): Fingerprint {
  return { brand: brandKey(product), bucket: bucket(product), archetype: archetype(product),
    attributes: attributes(product), title: normalizedTitle(product), tokens: tokens(product),
    image: imageKey(product) };
}
function similarity(left: Set<string>, right: Set<string>) {
  if (!left.size || !right.size) return { jaccard: 0, containment: 0 };
  let intersection = 0;
  for (const token of left) if (right.has(token)) intersection++;
  return { jaccard: intersection / (left.size + right.size - intersection),
    containment: intersection / Math.min(left.size, right.size) };
}
function clusterReason(left: Product, right: Product, a: Fingerprint, b: Fingerprint):
  CurationRemovalReason | null {
  if (left.asin && right.asin && left.asin.toUpperCase() === right.asin.toUpperCase()) return "exact-asin";
  if (a.title && a.title === b.title) return "exact-title";
  if (a.image && a.image === b.image) return "same-image";
  if (a.bucket !== b.bucket) return null;
  const title = similarity(a.tokens, b.tokens);
  const specs = similarity(a.attributes, b.attributes);
  if (a.archetype === b.archetype && a.archetype !== a.bucket &&
    (specs.containment >= 0.5 || title.jaccard >= 0.34 || title.containment >= 0.58)) {
    return "white-label-clone";
  }
  if (a.tokens.size >= 4 && b.tokens.size >= 4 &&
    title.jaccard >= 0.76 && title.containment >= 0.84) return "near-identical-title";
  return null;
}

export function confidence(product: Product): number {
  const reviews = Math.max(0, product.reviewCount || 0);
  return (reviews * product.rating + 500 * 4) / (reviews + 500);
}
function compare(left: Product, right: Product): number {
  const established = Number(right.reviewCount >= 500) - Number(left.reviewCount >= 500);
  if (established) return established;
  const delta = confidence(right) - confidence(left);
  const ratio = Math.max(left.reviewCount, right.reviewCount) /
    Math.max(1, Math.min(left.reviewCount, right.reviewCount));
  if (Math.abs(delta) <= 0.04 && ratio <= 2) {
    return left.price - right.price || delta || String(left.id).localeCompare(String(right.id));
  }
  return delta || right.reviewCount - left.reviewCount || left.price - right.price ||
    String(left.id).localeCompare(String(right.id));
}
function label(value: string): string {
  return value.split("-").map((word) => word === "lego" ? "LEGO" : word).join(" ");
}
function bestFor(winner: Product, group: Product[]): string {
  const value = archetype(winner);
  const name = value === bucket(winner)
    ? [...tokens(winner)].slice(0, 4).join(" ")
    : label(value);
  if (group.length <= 1) return `Best ${name}`;
  if (winner.reviewCount === Math.max(...group.map((item) => item.reviewCount)) &&
    winner.reviewCount >= 500) return `Most proven ${name}`;
  if (winner.price === Math.min(...group.map((item) => item.price))) return `Best-value ${name}`;
  return `Best overall ${name}`;
}
function eligible(product: Product): boolean {
  return Number.isFinite(product.price) && product.price > 0 &&
    Number.isFinite(product.reviewCount) && product.reviewCount >= 5 &&
    Number.isFinite(product.rating) && product.rating >= 3.8;
}

export function curateGuideWithReport(products: Product[],
  options: { maxPicks?: number } = {}): GuideCurationReport {
  const maxPicks = Math.max(1, Math.min(options.maxPicks ?? MAX_GUIDE_PICKS, MAX_GUIDE_PICKS));
  const removed: CurationRemoval[] = [];
  const candidates = products.filter((product) => {
    if (eligible(product)) return true;
    removed.push({ product, reason: "quality-floor", cluster: archetype(product) });
    return false;
  }).sort(compare);
  const fingerprints = new Map(candidates.map((product) => [product, fingerprint(product)]));
  const groups: Product[][] = [];
  for (const product of candidates) {
    const matching = groups.filter((group) => group.some((member) =>
      clusterReason(product, member, fingerprints.get(product)!, fingerprints.get(member)!) !== null));
    if (!matching.length) groups.push([product]);
    else {
      const merged = [product, ...matching.flat()].sort(compare);
      for (const group of matching) groups.splice(groups.indexOf(group), 1);
      groups.push(merged);
    }
  }
  const selected: Product[] = [];
  const usedReasons = new Set<string>();
  for (const group of groups.map((item) => item.sort(compare)).sort((a, b) => compare(a[0], b[0]))) {
    // One winner per form-factor cluster inherently enforces the intra-brand
    // cap without incorrectly treating distinct LEGO builds as variants.
    const winner = group[0];
    if (selected.length >= maxPicks) {
      for (const product of group) removed.push({ product, reason: "guide-limit",
        cluster: archetype(product) });
      continue;
    }
    let reason = bestFor(winner, group);
    if (usedReasons.has(reason)) {
      const differentiator = [...tokens(winner)].slice(0, 4).join(" ") ||
        brandKey(winner) || winner.asin || String(winner.id);
      reason = `${reason} — ${differentiator}`;
      if (usedReasons.has(reason)) reason = `${reason} ${winner.asin || winner.id}`;
    }
    usedReasons.add(reason);
    selected.push({ ...winner, bestFor: reason });
    for (const product of group) {
      if (product === winner) continue;
      removed.push({ product,
        reason: clusterReason(product, winner, fingerprints.get(product)!,
          fingerprints.get(winner)!) || "white-label-clone",
        winner, cluster: archetype(winner) });
    }
  }
  return { inputCount: products.length, eligibleCount: candidates.length, selected, removed };
}
export function curateGuide(products: Product[]): Product[] {
  return curateGuideWithReport(products).selected;
}
