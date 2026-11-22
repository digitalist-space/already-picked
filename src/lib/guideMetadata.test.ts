import assert from "node:assert/strict";
import test from "node:test";
import { applyGuideEditorialMetadata, MIN_HOMEPAGE_PRODUCTS } from "./guideMetadata.ts";
import type { LandingPage } from "./types.ts";

const sourcePage: LandingPage = {
  themeSlug: "incense-holders-made-with-natural-materials-under-10",
  pageTitle: "Incense Holders Made With Natural Materials Under $10",
  seoTitle: "Incense Holders Made With Natural Materials Under $10 | ThemeCart",
  metaDescription: "Browse our curated selection of incense holders.",
  pageHeading: "Incense Holders Made With Natural Materials Under $10",
  introCopy: "Browse our curated selection of incense holders.",
  aboutCopy: "About this guide",
  primaryCategory: "Incense Holders Made",
  status: "published",
  affiliateTag: "",
  heroImageUrl: "",
  createdDate: "2026-08-01",
  updatedDate: "2026-08-01",
};

test("editorial metadata cleans copy without changing the route slug", () => {
  const result = applyGuideEditorialMetadata(sourcePage);

  assert.equal(result.themeSlug, sourcePage.themeSlug);
  assert.equal(result.pageTitle, "Natural Incense Holders Under $10");
  assert.equal(result.primaryCategory, "Home & Desk");
  assert.equal(result.seoTitle, "Natural Incense Holders Under $10 | AlreadyPicked");
  assert.match(result.introCopy, /wood, bamboo, and stone/i);
});

test("homepage quality gate requires eight products", () => {
  assert.equal(MIN_HOMEPAGE_PRODUCTS, 8);
});
