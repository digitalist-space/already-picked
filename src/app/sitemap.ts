import type { MetadataRoute } from "next";
import {
  getPublishedLandingPages,
  getQualifyingLandingPageProducts,
} from "@/lib/products";
import { SITE_URL } from "@/lib/site";
import { MIN_HOMEPAGE_PRODUCTS } from "@/lib/guideMetadata";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const guides = await getPublishedLandingPages();
  const publicGuides = (
    await Promise.all(
      guides.map(async (guide) => ({
        guide,
        productCount: (
          await getQualifyingLandingPageProducts(
            guide.themeSlug,
            guide.affiliateTag || undefined,
            guide.maxPrice
          )
        ).length,
      }))
    )
  )
    .filter(({ productCount }) => productCount >= MIN_HOMEPAGE_PRODUCTS)
    .map(({ guide }) => guide);

  return [
    {
      url: SITE_URL,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/products`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...publicGuides.map((guide) => ({
      url: `${SITE_URL}/${guide.themeSlug}`,
      lastModified: guide.updatedDate || guide.createdDate || undefined,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
  ];
}
