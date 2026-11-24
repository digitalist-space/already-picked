import type { Product } from "./types";
import { normalizeProductTypeLabel } from "./categoryTaxonomy";

export const MAX_GUIDE_PICKS = 25;
const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const knownBrands = /^(gritin|glocusent|86lux)\b/i;

export function brandKey(p: Product): string {
  const explicit = Object.entries(p.specs || {}).find(([k]) => /^brand$/i.test(k))?.[1];
  return normalize(p.brand || explicit || p.title.match(knownBrands)?.[0] || "");
}

export function archetype(p: Product): string {
  const s = normalize([p.title, p.subcategory || "", ...Object.values(p.specs || {})].join(" "));
  if (/book light|reading light|neck light|reading lamp/.test(s)) {
    if (/zero blue|blue light free|630\s*nm|red light/.test(s)) return "Red-light reading";
    if (/neck|wearable/.test(s)) return "Hands-free neck reading";
    if (/clip|rechargeable|usb/.test(s)) return "Clip-on book lighting";
    if (/desk|table|standing/.test(s)) return "Desk reading lighting";
  }
  if (/page holder|thumb holder|thumb ring/.test(s) && /wood|bamboo/.test(s)) return "Wooden thumb page holding";
  if (/bookmark/.test(s) && /corner/.test(s) && /embroider/.test(s)) return "Embroidered corner bookmarks";
  if (/bookmark/.test(s) && /magnetic/.test(s)) return "Magnetic bookmarks";
  if (/bookmark/.test(s) && /metal/.test(s)) return "Metal bookmarks";
  return "";
}

function tokens(p: Product): Set<string> {
  const brand = brandKey(p);
  const s = normalize(p.title);
  return new Set(s.split(" ").filter(t => t.length > 1 && !brand.split(" ").includes(t) &&
    !/^(the|and|for|with|gift|gifts|pack|set|black|white|pink|blue|green|purple|color|new)$/.test(t)));
}
function bucket(p: Product): string {
  return normalize(normalizeProductTypeLabel(p.subcategory || p.category || ""));
}
function imageKey(p: Product): string {
  const s = p.imageUrl || "";
  return !s || /placeholder/i.test(s) ? "" : s.replace(/[?#].*$/, "").replace(/\._[^/]+(?=\.[a-z0-9]+$)/i, "");
}
function sameCluster(a: Product, b: Product): boolean {
  if (a.asin && b.asin && a.asin.toUpperCase() === b.asin.toUpperCase()) return true;
  const x = archetype(a), y = archetype(b);
  if (x && y) return x === y;
  if (imageKey(a) && imageKey(a) === imageKey(b)) return true;
  if (bucket(a) !== bucket(b)) return false;
  const l = tokens(a), r = tokens(b);
  if (l.size < 3 || r.size < 3) return false;
  const n = [...l].filter(t => r.has(t)).length;
  return n / (l.size + r.size - n) >= 0.72;
}

export function confidence(p: Product): number {
  const n = Math.max(0, p.reviewCount || 0);
  return (n * p.rating + 500 * 4.0) / (n + 500);
}
function compare(a: Product, b: Product): number {
  const established = Number(b.reviewCount >= 500) - Number(a.reviewCount >= 500);
  if (established) return established;
  const delta = confidence(b) - confidence(a);
  // Comparable evidence: prefer a lower price instead of redundant listings.
  if (Math.abs(delta) <= 0.04 && Math.max(a.reviewCount,b.reviewCount) <= 2 * Math.min(a.reviewCount,b.reviewCount)) {
    return a.price - b.price || delta || a.id.localeCompare(b.id);
  }
  return delta || b.reviewCount - a.reviewCount || a.price - b.price || a.id.localeCompare(b.id);
}

export function curateGuide(products: Product[]): Product[] {
  const ranked = products.filter(p => Number.isFinite(p.price) && p.price > 0).slice().sort(compare);
  const selected: Product[] = [];
  const brands = new Map<string, Product[]>();
  for (const p of ranked) {
    if (selected.length >= MAX_GUIDE_PICKS) break;
    if (selected.some(q => sameCluster(p, q))) continue;
    const brand = brandKey(p);
    const prior = brand ? brands.get(brand) || [] : [];
    if (prior.length >= 2 || prior.some(q => !archetype(q) || !archetype(p) || archetype(q) === archetype(p))) continue;
    selected.push({...p, bestFor: archetype(p) || undefined});
    if (brand) brands.set(brand, [...prior, p]);
  }
  return selected;
}
