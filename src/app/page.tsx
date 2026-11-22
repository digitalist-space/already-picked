import Link from "next/link";
import GuideDirectory from "@/components/GuideDirectory";
import FeaturedGuideRotator from "@/components/FeaturedGuideRotator";
import {
  getPublishedLandingPages,
  getQualifyingLandingPageProducts,
} from "@/lib/products";
import { MIN_HOMEPAGE_PRODUCTS } from "@/lib/guideMetadata";

export default async function Home() {
  const pages = await getPublishedLandingPages();
  const guidesWithImages = await Promise.all(
    pages.map(async (page) => {
      const products = await getQualifyingLandingPageProducts(
        page.themeSlug,
        page.affiliateTag,
        page.maxPrice
      );
      const representative =
        products.find((product) => product.featured) || products[0];
      return {
        page,
        productCount: products.length,
        representativeImageUrl: representative?.imageUrl || "",
      };
    })
  );
  const publicGuides = guidesWithImages.filter(
    ({ productCount }) => productCount >= MIN_HOMEPAGE_PRODUCTS
  );
  const featuredGuides = publicGuides.map(
    ({ page, productCount, representativeImageUrl }) => ({
      slug: page.themeSlug,
      title: page.pageTitle,
      category: page.primaryCategory,
      productCount,
      imageUrl: page.heroImageUrl || representativeImageUrl,
    })
  );
  const guides = publicGuides;

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

      <section className="trust-strip" aria-labelledby="how-we-pick-title">
        <div className="trust-strip-heading">
          <p className="eyebrow">Editorial standards</p>
          <h2 id="how-we-pick-title">How We Pick</h2>
        </div>
        <div className="trust-rules">
          <div>
            <strong>3.8★+ rating</strong>
            <span>A consistent quality floor</span>
          </div>
          <div>
            <strong>Verified review volume</strong>
            <span>Enough buyer feedback to compare</span>
          </div>
          <div>
            <strong>Strict price caps</strong>
            <span>Every pick stays within the guide budget</span>
          </div>
          <div>
            <strong>Practical attributes</strong>
            <span>Materials, fit, features, and included extras</span>
          </div>
        </div>
      </section>

      <section className="home-directory" id="guides">
        {guides.length ? (
          <GuideDirectory guides={guides} />
        ) : (
          <>
            <div className="directory-intro">
              <p className="eyebrow">Start with what you need</p>
              <h2>Browse by category</h2>
              <p>Choose a topic, then narrow the guides by budget or product type.</p>
            </div>
            <div className="empty-directory">
              <p>Published buying guides will appear here.</p>
              <span>
                Change a landing page&apos;s status to “published” in Google
                Sheets when it is ready.
              </span>
            </div>
          </>
        )}
      </section>
    </>
  );
}
