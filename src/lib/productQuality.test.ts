import assert from "node:assert/strict";
import test from "node:test";
import {
  isQualifyingProduct,
  priceCapFromSlug,
  resolveGuideMaxPrice,
  selectEditorialPicks,
} from "./productQuality.ts";
import {
  editorialProductTitle,
  getProductHook,
  pluralizedCount,
  preferredSourceTitle,
} from "./productPresentation.ts";
import type { Product } from "./types.ts";

const product = {
  rating: 3.8,
  reviewCount: 5,
} as Product;

test("public quality thresholds include their boundary values", () => {
  assert.equal(isQualifyingProduct(product), true);
  assert.equal(isQualifyingProduct({ ...product, rating: 3.79 }), false);
  assert.equal(isQualifyingProduct({ ...product, reviewCount: 4 }), false);
});

test("guide price caps exclude price drift and prefer explicit limits", () => {
  assert.equal(
    isQualifyingProduct({ ...product, price: 20 } as Product, { maxPrice: 20 }),
    true
  );
  assert.equal(
    isQualifyingProduct({ ...product, price: 20.01 } as Product, {
      maxPrice: 20,
    }),
    false
  );
  assert.equal(priceCapFromSlug("small-lego-and-creative-gifts-under-20"), 20);
  assert.equal(resolveGuideMaxPrice("gifts-under-20", 15), 15);
});

test("product titles remove keyword tails while preserving the raw-title tooltip source", () => {
  assert.equal(
    editorialProductTitle(
      "Wooden Brain Teaser Puzzle for Adults, Desk Toy, Stocking Stuffer, Travel Game | Bestseller"
    ),
    "Wooden Brain Teaser Puzzle for Adults"
  );
});

test("product titles preserve a descriptive set name after a brand-only pipe prefix", () => {
  assert.equal(
    editorialProductTitle(
      "LEGO | Botanicals Tiny Plants Building Set | Gift for Plant Lovers"
    ),
    "LEGO Botanicals Tiny Plants Building Set"
  );
});

test("counts pluralize without split text nodes", () => {
  assert.equal(pluralizedCount(1, "product"), "1 product");
  assert.equal(pluralizedCount(52, "product"), "52 products");
  assert.equal(pluralizedCount(1, "review"), "1 review");
});

test("product hooks prioritize product descriptions over guide-level editorial notes", () => {
  const hook = getProductHook({
    title: "Pocket Strategy Card Game",
    editorialNote:
      "Fast setup and travel-friendly play for families, game nights, and weekend trips.",
    description: "Compact strategy game for quick family rounds and travel.",
    specs: { Players: "2–4" },
  } as Product);

  assert.equal(hook, "Compact strategy game for quick family rounds and travel.");
  assert.ok(hook.length <= 85);
});

test("product hooks prioritize the sheet short_hook over every fallback", () => {
  assert.equal(
    getProductHook({
      title: "Pocket Strategy Card Game",
      shortHook: "Quick 15-minute rounds for two to four players.",
      editorialNote: "A guide-specific editorial note.",
      description: "A longer product description.",
      specs: { Players: "2–4" },
    } as Product),
    "Quick 15-minute rounds for two to four players."
  );
});

test("brand-only sheet titles yield to richer raw title or name sources", () => {
  assert.equal(
    preferredSourceTitle(
      "LEGO",
      "LEGO Botanicals Tiny Plants Building Set",
      "Tiny Plants"
    ),
    "LEGO Botanicals Tiny Plants Building Set"
  );
  assert.equal(
    preferredSourceTitle("LEGO Star Wars Millennium Falcon", "Unrelated fallback"),
    "LEGO Star Wars Millennium Falcon"
  );
});

test("product hooks use key specs before the guide-level editorial fallback", () => {
  assert.equal(
    getProductHook({
      title: "Pocket Strategy Card Game",
      editorialNote: "A guide-specific editorial fallback.",
      specs: { Players: "2–4", "Age Range": "8+", Color: "Blue" },
    } as Product),
    "Players: 2–4 · Age Range: 8+"
  );
});

test("product hooks suppress repeated guide descriptions", () => {
  const guideDescription =
    "Compact LEGO sets and hands-on gifts under $20, selected for build value and age-appropriate play.";

  assert.equal(
    getProductHook({
      title: "LEGO Creator Turtle",
      description: `${guideDescription} Compare prices and ratings.`,
      guideDescription,
      specs: { Pieces: "124", "Age Range": "7+" },
      editorialNote: "Guide-level fallback copy.",
    } as Product),
    "Age Range: 7+ · Pieces: 124"
  );
});

test("product hooks clean, de-duplicate, and clamp description fallbacks", () => {
  const hook = getProductHook({
    title: "Wooden Brain Teaser",
    description:
      "Wooden Brain Teaser — Builds spatial reasoning through screen-free solo play with a compact travel-ready design that stores easily.",
    specs: {},
  } as Product);

  assert.equal(
    hook,
    "Builds spatial reasoning through screen-free solo play with a compact travel-ready…"
  );
  assert.ok(hook.length <= 85);
  assert.equal(hook.includes("Wooden Brain Teaser"), false);
});

function pickProduct(
  id: string,
  rating: number,
  reviewCount: number,
  price: number
): Product {
  return { id, rating, reviewCount, price } as Product;
}

test("editorial picks select three distinct deterministic winners", () => {
  const products = [
    pickProduct("overall", 4.9, 500, 40),
    pickProduct("value", 4.4, 40, 8),
    pickProduct("popular", 4.3, 2000, 30),
    pickProduct("four", 4.1, 80, 20),
    pickProduct("five", 4.0, 70, 21),
    pickProduct("six", 4.2, 60, 22),
    pickProduct("seven", 4.1, 50, 23),
    pickProduct("eight", 4.0, 40, 24),
  ];

  assert.deepEqual(selectEditorialPicks(products), [
    { productId: "overall", badge: "best-overall" },
    { productId: "value", badge: "best-value" },
    { productId: "popular", badge: "most-popular" },
  ]);
});

test("editorial picks require eight qualifying products and respect candidate floors", () => {
  const sevenProducts = Array.from({ length: 7 }, (_, index) =>
    pickProduct(`product-${index}`, 4.5, 100 + index, 20 + index)
  );
  assert.deepEqual(selectEditorialPicks(sevenProducts), []);

  const products = [
    pickProduct("overall-ineligible", 5, 24, 30),
    pickProduct("overall", 4.8, 25, 35),
    pickProduct("value-ineligible", 4.29, 200, 5),
    pickProduct("value", 4.3, 20, 10),
    pickProduct("popular", 4.2, 1000, 40),
    pickProduct("six", 4.0, 50, 20),
    pickProduct("seven", 4.0, 50, 21),
    pickProduct("eight", 4.0, 50, 22),
  ];

  assert.deepEqual(selectEditorialPicks(products), [
    { productId: "overall", badge: "best-overall" },
    { productId: "value", badge: "best-value" },
    { productId: "popular", badge: "most-popular" },
  ]);
});
