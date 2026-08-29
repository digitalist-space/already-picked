import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProductGrid from "@/components/ProductGrid";
import {
  getCategories,
  getLandingPage,
  getLandingPageProducts,
  getPublishedLandingPages,
} from "@/lib/products";
import type { LandingPage, Product } from "@/lib/types";
import { brandedTitle } from "@/lib/site";
import { buildGuideJsonLd, serializeJsonLd } from "@/lib/structuredData";

// Guides are prerendered at build and refreshed hourly. Edits made through
// the admin screen call revalidatePath("/<slug>") and land immediately.
export const revalidate = 3600;

export async function generateStaticParams() {
  const pages = await getPublishedLandingPages();
  return pages.map((page) => ({ slug: page.themeSlug }));
}

type PageProps = {
  params: Promise<{ slug: string }>;
};

function readableList(items: string[]): string {
  if (items.length < 2) return items[0] || "popular products";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

function productTypes(products: Product[]): string[] {
  // Only `subcategory` holds real product types ("Cleaning Cloths & Towels").
  // `tags` is a pipe-separated keyword list, so reading it here produced
  // sentences like "the collection includes back, essentials, school".
  const counts = new Map<string, number>();

  products.forEach((product) => {
    const value = product.subcategory?.trim();
    if (!value) return;
    counts.set(value, (counts.get(value) || 0) + 1);
  });

  return Array.from(counts)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 4)
    .map(([value]) => value.toLowerCase());
}

function buildSeoParagraph(page: LandingPage, products: Product[]): string {
  const count = products.length;
  const types = productTypes(products);
  const prices = products.map((product) => product.price).filter((price) => price > 0);
  const ratings = products
    .map((product) => product.rating)
    .filter((rating) => rating > 0);
  const minimumPrice = prices.length ? Math.min(...prices) : 0;
  const maximumPrice = prices.length ? Math.max(...prices) : 0;
  const averageRating = ratings.length
    ? ratings.reduce((total, rating) => total + rating, 0) / ratings.length
    : 0;
  const title = page.pageHeading || page.pageTitle;
  const isPinkStuff = `${page.themeSlug} ${title}`
    .toLowerCase()
    .includes("pink stuff");

  const opening = isPinkStuff
    ? `Explore ${count} of the best Pink Stuff products for kitchens, bathrooms, and everyday home cleaning.`
    : `Explore our guide to ${title.toLowerCase()}, featuring ${count} carefully selected ${page.primaryCategory.toLowerCase()} products.`;
  const typeCopy = isPinkStuff
    ? " The collection includes cleaning pastes, sprays, creams, and household cleaning accessories."
    : types.length
      ? ` The collection includes ${readableList(types)}.`
      : "";
  const priceCopy =
    minimumPrice && maximumPrice
      ? ` Prices currently range from $${minimumPrice.toFixed(2)} to $${maximumPrice.toFixed(2)}`
      : "";
  const ratingCopy = averageRating
    ? `, with an average customer rating of ${averageRating.toFixed(1)} out of 5`
    : "";

  const needs = isPinkStuff ? "cleaning needs" : "needs";

  return `${opening}${typeCopy}${priceCopy}${ratingCopy}. Compare product uses, prices, ratings, and key details to find the option that best fits your ${needs} and budget.`;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await getLandingPage(slug);
  if (!page || page.status !== "published") return {};

  return {
    title: {
      absolute: brandedTitle(page.seoTitle || page.pageTitle),
    },
    description: page.metaDescription,
    alternates: { canonical: `/${page.themeSlug}` },
    openGraph: {
      title: brandedTitle(page.seoTitle || page.pageTitle),
      description: page.metaDescription,
      type: "article",
      images: page.heroImageUrl ? [page.heroImageUrl] : undefined,
    },
  };
}

export default async function GuidePage({ params }: PageProps) {
  const { slug } = await params;
  const page = await getLandingPage(slug);

  if (!page || page.status !== "published") notFound();

  const products = await getLandingPageProducts(
    slug,
    page.affiliateTag || undefined
  );
  const categories = getCategories(products);
  const aboutCopy = page.aboutCopy || buildSeoParagraph(page, products);

  return (
    <div className="guide-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(buildGuideJsonLd(page, products)),
        }}
      />
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span aria-hidden="true">/</span>
        <Link href="/#guides">{page.primaryCategory}</Link>
        <span aria-hidden="true">/</span>
        <span>{page.pageTitle}</span>
      </nav>

      <header className="guide-hero">
        <div>
          <p className="eyebrow">{page.primaryCategory} buying guide</p>
          <h1>{page.pageHeading || page.pageTitle}</h1>
          {page.introCopy && <p>{page.introCopy}</p>}
          <div className="guide-facts">
            <span>
              {products.length} product{products.length === 1 ? "" : "s"}{" "}
              reviewed
            </span>
            {page.updatedDate && <span>Updated {page.updatedDate}</span>}
          </div>
        </div>
        {page.heroImageUrl && (
          <div className="guide-hero-image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={page.heroImageUrl} alt="" />
          </div>
        )}
        {!page.heroImageUrl && (
          <aside className="guide-hero-copy" aria-labelledby="about-guide">
            <p className="eyebrow">A clearer way to choose</p>
            <h2 id="about-guide">About this guide</h2>
            <p>{aboutCopy}</p>
          </aside>
        )}
      </header>

      {page.heroImageUrl && (
        <section className="guide-about" aria-labelledby="about-guide">
          <p className="eyebrow">A clearer way to choose</p>
          <h2 id="about-guide">About this guide</h2>
          <p>{aboutCopy}</p>
        </section>
      )}

      <section className="guide-products" aria-labelledby="guide-products-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Compare the shortlist</p>
            <h2 id="guide-products-title">Our selected products</h2>
          </div>
          <p>Filter this guide by price or rating to find your best match.</p>
        </div>

        {products.length === 0 ? (
          <div className="empty-directory">
            <p>No products have been added to this guide yet.</p>
          </div>
        ) : (
          <ProductGrid products={products} categories={categories} />
        )}
      </section>
    </div>
  );
}
