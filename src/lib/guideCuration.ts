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
    if (/\b(?:desk|table|standing)\b/.test(text)) return "desk-reading-lamp";
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
function titleTokens(product: Product): Set<string> {
  const brand = new Set(brandKey(product).split(" "));
  return new Set(normalizedTitle(product).split(" ")
    .filter((token) => token.length > 1 && !/^\d+(?:\.\d+)?$/.test(token) &&
      !STOP_WORDS.has(token) && !brand.has(token)));
}
export function functionalTokens(product: Product): Set<string> {
  const result = titleTokens(product);
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
  return !value || value.includes("placeholder") ? "" :
    value.replace(/[?#].*$/, "").replace(/\._[^/]+(?=\.[a-z0-9]+$)/i, "");
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
  if (title.jaccard >= FUNCTIONAL_JACCARD_THRESHOLD) {
    return "white-label-clone";
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
function compare(left: Product, right: Product): number {
  const delta = confidence(right) - confidence(left);
  if (Math.abs(delta) <= BAYESIAN_PRICE_TIE_THRESHOLD) {
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
    ? [...titleTokens(winner)].slice(0, 4).join(" ")
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
      let reason = bestFor(winner, group);
      if (usedReasons.has(reason)) {
        const differentiator = [...titleTokens(winner)].slice(0, 4).join(" ") ||
          brandKey(winner) || winner.asin || String(winner.id);
        reason = `${reason} — ${differentiator}`;
        if (usedReasons.has(reason)) reason = `${reason} ${winner.asin || winner.id}`;
      }
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
