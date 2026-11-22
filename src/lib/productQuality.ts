import type { Product } from "./types";

export const MIN_PRODUCT_RATING = 3.8;
export const MIN_PRODUCT_REVIEWS = 5;
export const MIN_EDITORIAL_BADGE_PRODUCTS = 8;

export type EditorialBadge =
  | "best-overall"
  | "best-value"
  | "most-popular";

export type EditorialPick = {
  productId: string;
  badge: EditorialBadge;
};

export function isQualifyingProduct(product: Product): boolean {
  return (
    product.rating >= MIN_PRODUCT_RATING &&
    product.reviewCount >= MIN_PRODUCT_REVIEWS
  );
}

export function qualifyingProducts(products: Product[]): Product[] {
  return products.filter(isQualifyingProduct);
}

function compareId(a: Product, b: Product): number {
  return a.id.localeCompare(b.id);
}

function overallScore(product: Product): number {
  return product.rating * 0.8 + Math.log10(product.reviewCount + 1) * 0.2;
}

export function selectEditorialPicks(products: Product[]): EditorialPick[] {
  const eligible = qualifyingProducts(products);
  if (eligible.length < MIN_EDITORIAL_BADGE_PRODUCTS) return [];

  const picks: EditorialPick[] = [];
  const selectedIds = new Set<string>();

  const bestOverall = eligible
    .filter((product) => product.reviewCount >= 25)
    .sort(
      (a, b) =>
        overallScore(b) - overallScore(a) ||
        b.rating - a.rating ||
        b.reviewCount - a.reviewCount ||
        compareId(a, b)
    )[0];

  if (bestOverall) {
    picks.push({ productId: bestOverall.id, badge: "best-overall" });
    selectedIds.add(bestOverall.id);
  }

  const bestValue = eligible
    .filter(
      (product) =>
        !selectedIds.has(product.id) &&
        product.rating >= 4.3 &&
        product.reviewCount >= 20
    )
    .sort(
      (a, b) =>
        a.price - b.price ||
        b.rating - a.rating ||
        b.reviewCount - a.reviewCount ||
        compareId(a, b)
    )[0];

  if (bestValue) {
    picks.push({ productId: bestValue.id, badge: "best-value" });
    selectedIds.add(bestValue.id);
  }

  const mostPopular = eligible
    .filter(
      (product) => !selectedIds.has(product.id) && product.rating >= 4.2
    )
    .sort(
      (a, b) =>
        b.reviewCount - a.reviewCount ||
        b.rating - a.rating ||
        a.price - b.price ||
        compareId(a, b)
    )[0];

  if (mostPopular) {
    picks.push({ productId: mostPopular.id, badge: "most-popular" });
  }

  return picks;
}
