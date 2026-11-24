import assert from "node:assert/strict";
import test from "node:test";
import {
  DESK_GIFT_SUBCATEGORIES,
  isDeskGiftRelevant,
  normalizeDeskGiftSubcategory,
} from "./categoryTaxonomy.ts";

test("desk gift imports normalize into the four editorial buckets", () => {
  const examples = [
    ["Self-adhesive cable clips for an office desk", "Desk Organizers & Cable Clips"],
    ["Infinity cube sensory fidget", "Stress Relief & Fidgets"],
    ["Coffee mug warmer for desk", "Drinkware & Mug Warmers"],
    ["Sarcastic sticky notes for coworkers", "Notepads, Pens & Desk Humor"],
  ] as const;
  for (const [title, expected] of examples) {
    assert.equal(normalizeDeskGiftSubcategory(title), expected);
    assert.ok(DESK_GIFT_SUBCATEGORIES.includes(expected));
  }
});

test("desk gift relevance excludes off-theme apparel and keeps desk products", () => {
  assert.equal(isDeskGiftRelevant("Funny novelty socks for coworkers"), false);
  assert.equal(isDeskGiftRelevant("Personalized beanie hat"), false);
  assert.equal(isDeskGiftRelevant("Compact desktop cable organizer"), true);
  assert.equal(isDeskGiftRelevant("Funny office notebook for coworkers"), true);
});
