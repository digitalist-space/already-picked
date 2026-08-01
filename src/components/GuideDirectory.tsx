"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { LandingPage } from "@/lib/types";

export interface GuideSummary {
  page: LandingPage;
  productCount: number;
  representativeImageUrl?: string;
}

type GuideSort = "newest" | "a-z" | "products";

function guideLabel(page: LandingPage): string {
  const value = `${page.pageTitle} ${page.themeSlug}`.toLowerCase();
  if (value.includes("under-") || value.includes("under $")) return "Budget guide";
  if (value.includes("best")) return "Best picks";
  if (value.includes("compar")) return "Comparison";
  return "Product guide";
}

export default function GuideDirectory({
  guides,
}: {
  guides: GuideSummary[];
}) {
  const categories = useMemo(
    () =>
      Array.from(
        new Set(guides.map(({ page }) => page.primaryCategory).filter(Boolean))
      ).sort(),
    [guides]
  );
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<GuideSort>("newest");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = guides.filter(({ page }) => {
      const matchesCategory = !category || page.primaryCategory === category;
      const matchesSearch =
        !query ||
        page.pageTitle.toLowerCase().includes(query) ||
        page.introCopy.toLowerCase().includes(query) ||
        page.primaryCategory.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });

    return result.sort((a, b) => {
      if (sort === "a-z") return a.page.pageTitle.localeCompare(b.page.pageTitle);
      if (sort === "products") return b.productCount - a.productCount;
      return (
        (b.page.updatedDate || b.page.createdDate).localeCompare(
          a.page.updatedDate || a.page.createdDate
        ) || a.page.pageTitle.localeCompare(b.page.pageTitle)
      );
    });
  }, [category, guides, search, sort]);

  return (
    <div>
      <div className="category-overview">
        {categories.map((item) => {
          const count = guides.filter(
            ({ page }) => page.primaryCategory === item
          ).length;
          return (
            <button
              key={item}
              className={category === item ? "active" : ""}
              onClick={() => setCategory(category === item ? "" : item)}
            >
              <span>{item}</span>
              <small>
                {count} guide{count === 1 ? "" : "s"}
              </small>
            </button>
          );
        })}
      </div>

      <div className="guide-toolbar">
        <label className="guide-search">
          <span className="sr-only">Search buying guides</span>
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="m21 21-4.3-4.3m2.3-5.2a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" />
          </svg>
          <input
            type="search"
            placeholder="Search guides, products or topics"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <select
          aria-label="Filter guides by category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          aria-label="Sort guides"
          value={sort}
          onChange={(event) => setSort(event.target.value as GuideSort)}
        >
          <option value="newest">Recently updated</option>
          <option value="a-z">A–Z</option>
          <option value="products">Most products</option>
        </select>
      </div>

      <div className="category-pills" aria-label="Guide categories">
        <button
          className={!category ? "active" : ""}
          onClick={() => setCategory("")}
        >
          All guides
        </button>
        {categories.map((item) => (
          <button
            key={item}
            className={category === item ? "active" : ""}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="directory-heading">
        <div>
          <p className="eyebrow">Explore our research</p>
          <h2>Buying guides</h2>
        </div>
        <p>
          {filtered.length} guide{filtered.length === 1 ? "" : "s"}
        </p>
      </div>

      {filtered.length ? (
        <div className="guide-grid">
          {filtered.map(({ page, productCount, representativeImageUrl }, index) => (
            <article className="guide-card" key={page.themeSlug}>
              <Link
                href={`/${page.themeSlug}`}
                className="guide-card-media"
                aria-label={`Explore ${page.pageTitle}`}
              >
                {page.heroImageUrl ? (
                  // Remote sources vary by workbook; a regular img keeps them flexible.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={page.heroImageUrl} alt="" />
                ) : (
                  <div className={`guide-art guide-art-${(index % 3) + 1}`}>
                    {representativeImageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        className="guide-art-img"
                        src={representativeImageUrl}
                        alt=""
                      />
                    )}
                    <span>{page.primaryCategory || "Product guide"}</span>
                  </div>
                )}
              </Link>
              <div className="guide-card-body">
                <div className="guide-card-meta">
                  <span>{page.primaryCategory || "Product guide"}</span>
                  <span>{guideLabel(page)}</span>
                </div>
                <h3>
                  <Link href={`/${page.themeSlug}`}>{page.pageTitle}</Link>
                </h3>
                <p>
                  {page.introCopy ||
                    `Compare our hand-picked products and find the right choice for your needs.`}
                </p>
                <div className="guide-card-footer">
                  <span>
                    {productCount} product{productCount === 1 ? "" : "s"}
                  </span>
                  <Link href={`/${page.themeSlug}`}>
                    Explore guide <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-directory">
          <p>No guides match those filters.</p>
          <button
            onClick={() => {
              setSearch("");
              setCategory("");
            }}
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
