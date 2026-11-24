import type { LandingPage } from "./types";

export const MIN_HOMEPAGE_PRODUCTS = 8;

type GuideEditorialMetadata = {
  title: string;
  category: string;
  summary: string;
};

const GUIDE_EDITORIAL_METADATA: Record<string, GuideEditorialMetadata> = {
  "handmade-crochet-animals-positivity-under-5": {
    title: "Handmade Crochet Gift Animals Under $5",
    category: "Gifts Under $10",
    summary:
      "Positive-message crochet animals under $5, screened for strong ratings, gift-ready designs, and compact desk-friendly sizing.",
  },
  "handmade-natural-cotton-coasters-under-10": {
    title: "Handmade Natural Cotton Coasters Under $10",
    category: "Home & Desk",
    summary:
      "Absorbent cotton coasters under $10, selected for natural woven materials, table protection, and versatile boho or farmhouse styling.",
  },
  "incense-holders-made-with-natural-materials-under-10": {
    title: "Natural Incense Holders Under $10",
    category: "Home & Desk",
    summary:
      "Wood, bamboo, and stone incense holders under $10, chosen for stable construction, effective ash catching, and easy cleanup.",
  },
  "best-portable-power-stations-for-apartments-camping-and-emergencies-under-50": {
    title: "Best Portable Power Stations Under $50",
    category: "Outdoor & Emergency",
    summary:
      "Compact backup power under $50, evaluated for usable charging ports, portability, battery capacity, and emergency practicality.",
  },
  "plush-soft-fluffy-keychain-charms-for-bags-under-5": {
    title: "Plush Bag Charms Under $5",
    category: "Gifts Under $10",
    summary:
      "Soft bag charms under $5, filtered for secure clips, appealing textures, compact proportions, and giftable character designs.",
  },
  "wallet-style-iphone-17-leather-cases-for-men": {
    title: "Wallet-Style iPhone 17 Leather Cases for Men",
    category: "Tech & Phone Cases",
    summary:
      "Wallet-style iPhone 17 cases compared for card capacity, magnetic closure, durable materials, camera protection, and pocket-friendly bulk.",
  },
  "best-iphone-duo-cases": {
    title: "Best iPhone Duo Cases",
    category: "Tech & Phone Cases",
    summary:
      "Dual-layer iPhone cases selected for shock protection, reinforced corners, dependable grip, and practical everyday fit.",
  },
  "reading-lights-and-book-accessories": {
    title: "Reading Lights & Book Accessories",
    category: "Home & Desk",
    summary:
      "Rechargeable reading lights and useful book accessories chosen for adjustable brightness, comfortable handling, and travel-ready designs.",
  },
  "customizable-cutest-bag-charms-under-10": {
    title: "Customizable Bag Charms Under $10",
    category: "Gifts Under $10",
    summary:
      "Personalized bag charms under $10, selected for clear customization options, secure hardware, and polished gift-ready finishes.",
  },
  "compact-card-and-party-games-under-10-stocking-stuffers": {
    title: "Compact Card & Party Games Under $10",
    category: "Crafts & Games",
    summary:
      "Portable card and party games under $10, filtered for quick setup, replay value, compact packaging, and broad group appeal.",
  },
  "small-puzzles-and-brainteasers-under-10": {
    title: "Small Puzzles & Brainteasers Under $10",
    category: "Crafts & Games",
    summary:
      "Pocket-size puzzles under $10, chosen for durable pieces, satisfying difficulty, repeat play, and easy travel or desk storage.",
  },
  "mini-craft-kits-crochet-embroidery-watercolor-under-25": {
    title: "Mini Craft Kits: Crochet, Embroidery & Watercolor Under $25",
    category: "Crafts & Games",
    summary:
      "Beginner-friendly craft kits under $25 with the core tools, materials, and instructions needed to complete a small creative project.",
  },
  "needoh-sensory-toys-under-25": {
    title: "NeeDoh Sensory Toys Under $25",
    category: "Crafts & Games",
    summary:
      "NeeDoh sensory toys under $25, compared for tactile variety, durable construction, portable sizing, and calming hands-on play.",
  },
  "small-lego-and-creative-gifts-under-20": {
    title: "Small LEGO & Creative Gifts Under $20",
    category: "Crafts & Games",
    summary:
      "Compact LEGO sets and hands-on gifts under $20, selected for build value, age-appropriate play, and gift-friendly packaging.",
  },
  "book-lover-gifts-and-reading-accessories-under-15": {
    title: "Book Lover Gifts & Reading Accessories Under $15",
    category: "Gifts & Stocking Stuffers",
    summary:
      "Rechargeable book lights, page holders, and reading accessories under $15, filtered for 3.8★+ ratings and reliable review volume.",
  },
  "desk-and-coworker-stocking-stuffers-under-15": {
    title: "Desk & Coworker Stocking Stuffers Under $15",
    category: "Gifts & Stocking Stuffers",
    summary:
      "Desk organizers, stress-relief gifts, drinkware, and office humor under $15, filtered for 3.8★+ ratings and reliable review volume.",
  },
};

export function applyGuideEditorialMetadata(page: LandingPage): LandingPage {
  const metadata = GUIDE_EDITORIAL_METADATA[page.themeSlug];
  if (!metadata) return page;

  return {
    ...page,
    pageTitle: metadata.title,
    seoTitle: `${metadata.title} | AlreadyPicked`,
    metaDescription: metadata.summary,
    pageHeading: metadata.title,
    introCopy: metadata.summary,
    primaryCategory: metadata.category,
  };
}
