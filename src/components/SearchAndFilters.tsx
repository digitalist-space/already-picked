"use client";

import { FilterState, SortOption } from "@/lib/types";

interface SearchAndFiltersProps {
  filters: FilterState;
  categories: string[];
  onFilterChange: (filters: FilterState) => void;
  resultCount: number;
}

export default function SearchAndFilters({
  filters,
  categories,
  onFilterChange,
  resultCount,
}: SearchAndFiltersProps) {
  const update = (partial: Partial<FilterState>) =>
    onFilterChange({ ...filters, ...partial });

  return (
    <div className="mb-8 space-y-4">
      {/* Search bar */}
      <div className="relative">
        <svg
          className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          placeholder="Search products..."
          value={filters.search}
          onChange={(e) => update({ search: e.target.value })}
          className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-12 pr-4 text-sm shadow-sm transition-shadow placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
        />
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-3">
        {categories.length > 1 && (
          <select
            aria-label="Filter products by category"
            value={filters.category}
            onChange={(e) => update({ category: e.target.value })}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            <option value="">All categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        )}

        {/* Price range */}
        <div className="flex items-center gap-1">
          <input
            type="number"
            placeholder="Min $"
            value={filters.minPrice ?? ""}
            onChange={(e) =>
              update({
                minPrice: e.target.value ? parseFloat(e.target.value) : null,
              })
            }
            className="w-24 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
          <span className="text-gray-400">–</span>
          <input
            type="number"
            placeholder="Max $"
            value={filters.maxPrice ?? ""}
            onChange={(e) =>
              update({
                maxPrice: e.target.value ? parseFloat(e.target.value) : null,
              })
            }
            className="w-24 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>

        {/* Rating filter */}
        <select
          value={filters.minRating ?? ""}
          onChange={(e) =>
            update({
              minRating: e.target.value ? parseFloat(e.target.value) : null,
            })
          }
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        >
          <option value="">Any Rating</option>
          <option value="4.5">4.5+ Stars</option>
          <option value="4">4+ Stars</option>
          <option value="3.5">3.5+ Stars</option>
          <option value="3">3+ Stars</option>
        </select>

        {/* Sort */}
        <select
          value={filters.sort}
          onChange={(e) => update({ sort: e.target.value as SortOption })}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        >
          <option value="featured">Featured</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="rating">Highest Rated</option>
          <option value="newest">Newest</option>
        </select>

        {/* Clear filters */}
        {(filters.search ||
          filters.category ||
          filters.subcategory ||
          filters.minPrice !== null ||
          filters.maxPrice !== null ||
          filters.minRating !== null ||
          filters.sort !== "featured") && (
          <button
            onClick={() =>
              onFilterChange({
                search: "",
                category: "",
                subcategory: "",
                minPrice: null,
                maxPrice: null,
                minRating: null,
                sort: "featured",
              })
            }
            className="rounded-lg px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          >
            Clear filters
          </button>
        )}

        {/* Result count */}
        <span className="ml-auto text-sm text-gray-400 dark:text-gray-500">
          {resultCount} product{resultCount !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}
