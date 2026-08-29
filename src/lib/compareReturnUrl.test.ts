import assert from "node:assert/strict";
import test from "node:test";
import { getCompareReturnUrl } from "./compareReturnUrl.ts";

test("direct comparison visits return to All Products", () => {
  assert.equal(getCompareReturnUrl(), "/products");
});

test("comparisons from All Products return to All Products", () => {
  assert.equal(getCompareReturnUrl("/products"), "/products");
});

test("comparisons return to each originating buying guide", () => {
  for (const guide of [
    "/plush-soft-fluffy-keychain-charms",
    "/pink-stuff-cleaning-products",
    "/boho-home-decor",
  ]) {
    assert.equal(getCompareReturnUrl(guide), guide);
  }
});

test("external and malformed return URLs fall back to All Products", () => {
  for (const unsafeUrl of [
    "https://example.com/phishing",
    "//example.com/phishing",
    "/\\example.com/phishing",
    "/compare",
  ]) {
    assert.equal(getCompareReturnUrl(unsafeUrl), "/products");
  }

  assert.equal(getCompareReturnUrl(["/products", "/another-page"]), "/products");
});
