import type { MetadataRoute } from "next";
import { getPublishedLandingPages } from "@/lib/products";
import { SITE_URL } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const guides = await getPublishedLandingPages();

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
    ...guides.map((guide) => ({
      url: `${SITE_URL}/${guide.themeSlug}`,
      lastModified: guide.updatedDate || guide.createdDate || undefined,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
  ];
}
