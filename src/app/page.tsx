import Link from "next/link";
import GuideDirectory from "@/components/GuideDirectory";
import FeaturedGuideRotator from "@/components/FeaturedGuideRotator";
import {
  getLandingPageProducts,
  getPageProducts,
  getPublishedLandingPages,
} from "@/lib/products";

export default async function Home() {
  const [pages, pageProducts] = await Promise.all([
    getPublishedLandingPages(),
    getPageProducts(),
  ]);
  const productCounts = pageProducts.reduce<Record<string, number>>(
    (counts, item) => {
      counts[item.themeSlug] = (counts[item.themeSlug] || 0) + 1;
      return counts;
    },
    {}
  );
  const guidesWithImages = await Promise.all(
    pages.map(async (page) => {
      const products = await getLandingPageProducts(
        page.themeSlug,
        page.affiliateTag
      );
      const representative =
        products.find((product) => product.featured) || products[0];
      return {
        page,
        productCount: productCounts[page.themeSlug] || 0,
        representativeImageUrl: representative?.imageUrl || "",
      };
    })
  );
  const featuredGuides = guidesWithImages.map(
    ({ page, productCount, representativeImageUrl }) => ({
      slug: page.themeSlug,
      title: page.pageTitle,
      category: page.primaryCategory,
      productCount,
      imageUrl: page.heroImageUrl || representativeImageUrl,
    })
  );
  const guides = guidesWithImages;

  return (
    <>
      <section className="home-hero">
        <div className="home-hero-inner">
          <p className="eyebrow">Clear choices. Less scrolling.</p>
          <h1>Find products worth bringing home.</h1>
          <p className="hero-copy">
            AlreadyPicked turns crowded product searches into practical,
            curated buying guides—so you can compare the right options with
            confidence.
          </p>
          <div className="hero-actions">
            <a className="primary-action" href="#guides">
              Explore buying guides
            </a>
            <Link className="secondary-action" href="/products">
              Browse all products
            </Link>
          </div>
          <div className="hero-proof" aria-label="What AlreadyPicked offers">
            <span>Hand-picked collections</span>
            <span>Side-by-side comparisons</span>
            <span>Clear price and rating filters</span>
          </div>
        </div>
        {featuredGuides.length > 0 && (
          <FeaturedGuideRotator guides={featuredGuides} />
        )}
      </section>

      <section className="home-directory" id="guides">
        <div className="directory-intro">
          <p className="eyebrow">Start with what you need</p>
          <h2>Browse by category</h2>
          <p>Choose a topic, then narrow the guides by budget or product type.</p>
        </div>
        {guides.length ? (
          <GuideDirectory guides={guides} />
        ) : (
          <div className="empty-directory">
            <p>Published buying guides will appear here.</p>
            <span>
              Change a landing page&apos;s status to “published” in Google
              Sheets when it is ready.
            </span>
          </div>
        )}
      </section>
    </>
  );
}
