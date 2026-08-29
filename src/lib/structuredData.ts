import type { LandingPage, Product } from "./types";
import { SITE_NAME, SITE_URL } from "./site";

/**
 * JSON-LD for a guide page.
 *
 * Deliberately omits `aggregateRating`. The star ratings shown on the cards
 * come from Amazon, not from reviews collected by this site, and Google's
 * structured data policy expects rating markup to be first-party. Marking up
 * someone else's ratings as our own risks a manual action, so the ratings stay
 * visible to readers but out of the markup.
 */
export function buildGuideJsonLd(
  page: LandingPage,
  products: Product[]
): Record<string, unknown> {
  const pageUrl = `${SITE_URL}/${page.themeSlug}`;
  const heading = page.pageHeading || page.pageTitle;

  const breadcrumb = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: page.primaryCategory,
        item: `${SITE_URL}/#guides`,
      },
      { "@type": "ListItem", position: 3, name: page.pageTitle, item: pageUrl },
    ],
  };

  const itemList = {
    "@type": "ItemList",
    name: heading,
    description: page.metaDescription || undefined,
    numberOfItems: products.length,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: products.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: buildProduct(product),
    })),
  };

  return {
    "@context": "https://schema.org",
    "@graph": [breadcrumb, itemList],
  };
}

function buildProduct(product: Product): Record<string, unknown> {
  const node: Record<string, unknown> = {
    "@type": "Product",
    name: product.title,
  };

  if (product.description) node.description = product.description;
  if (product.imageUrl && !product.imageUrl.startsWith("/")) {
    node.image = product.imageUrl;
  }
  if (product.asin) node.sku = product.asin;
  if (product.category) node.category = product.category;

  if (product.price > 0) {
    node.offers = {
      "@type": "Offer",
      price: product.price.toFixed(2),
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: product.affiliateUrl,
      seller: { "@type": "Organization", name: "Amazon" },
    };
  }

  return node;
}

export function buildSiteJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
  };
}

/**
 * Serialise for embedding in a <script> tag. Escaping `<` prevents any sheet
 * value containing `</script>` from breaking out of the tag.
 */
export function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
