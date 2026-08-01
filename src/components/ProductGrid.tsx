"use client";

import { useState, useMemo } from "react";
import { Product, FilterState } from "@/lib/types";
import ProductCard from "./ProductCard";
import SearchAndFilters from "./SearchAndFilters";

type ProductType = {
  name: string;
  count: number;
  imageUrl: string;
};

function productTypeFor(product: Product) {
  if (product.subcategory?.trim()) return product.subcategory.trim();

  const text = `${product.title} ${product.category}`.toLowerCase();
  const has = (...terms: string[]) => terms.some((term) => text.includes(term));

  if (has("bead", "garland")) return "Beads & Garlands";
  if (has("bowl filler", "vase filler", "decorative ball", "rattan ball", "wicker ball", "moss ball", "orb")) return "Vase Fillers & Decorative Balls";
  if (has("dried flower", "dried grass", "pampas", "botanical", "eucalyptus", "billy button")) return "Dried Flowers & Botanicals";
  if (has("artificial flower", "fake flower", "faux flower", "artificial plant", "fake plant", "faux plant", "greenery", "stem")) return "Artificial Flowers & Greenery";
  if (has("candle holder", "tea light", "tealight", "incense holder", "incense burner")) return "Candle & Incense Holders";
  if (has("macrame", "macramé", "wall hanging", "tapestry")) return "Wall Hangings & Macrame";
  if (has("wall basket", "woven wall", "basket wall")) return "Wall Baskets & Woven Decor";
  if (has("vase", "planter", "plant pot", "flower pot")) return "Vases & Planters";
  if (has("wind chime", "suncatcher", "sun catcher")) return "Wind Chimes & Suncatchers";
  if (has("crystal tree", "gem tree", "figurine", "statue")) return "Figurines & Crystal Trees";
  if (has("wood knot", "wood chain", "wooden chain", "wood sculpture", "wood object")) return "Wooden Objects & Sculptures";
  if (has("tray", "bowl", "basket")) return "Trays, Bowls & Baskets";
  if (has("coaster", "table decor", "tabletop")) return "Coasters & Table Decor";
  if (has("sponge", "scrubber", "scouring", "eraser pad", "scrub pad")) return "Sponges & Scrubbers";
  if (has("brush", "duster", "crevice", "drain tool", "squeegee")) return "Brushes & Cleaning Tools";
  if (has("cloth", "towel", "rag", "microfiber")) return "Cleaning Cloths & Towels";
  if (has("bathroom", "toilet", "shower", "tub cleaner")) return "Bathroom & Toilet Cleaners";
  if (has("degreaser", "kitchen cleaner", "oven", "cooktop")) return "Degreasers & Kitchen Cleaners";
  if (has("paste", "cream cleaner", "cleaning cream")) return "Cleaning Pastes & Creams";
  if (has("all purpose", "all-purpose", "multipurpose", "multi-purpose", "multi-surface")) return "Multi-Surface Cleaners";
  return "";
}

function filterAndSort(products: Product[], filters: FilterState): Product[] {
  let result = [...products];

  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q)) ||
        p.category.toLowerCase().includes(q) ||
        productTypeFor(p).toLowerCase().includes(q)
    );
  }

  if (filters.category) {
    result = result.filter((p) => p.category === filters.category);
  }

  if (filters.subcategory) {
    result = result.filter((p) => productTypeFor(p) === filters.subcategory);
  }

  if (filters.minPrice !== null) {
    result = result.filter((p) => p.price >= filters.minPrice!);
  }
  if (filters.maxPrice !== null) {
    result = result.filter((p) => p.price <= filters.maxPrice!);
  }

  if (filters.minRating !== null) {
    result = result.filter((p) => p.rating >= filters.minRating!);
  }

  switch (filters.sort) {
    case "price-asc":
      result.sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      result.sort((a, b) => b.price - a.price);
      break;
    case "rating":
      result.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
      break;
    case "newest":
      result.sort((a, b) => b.dateAdded.localeCompare(a.dateAdded));
      break;
    case "featured":
    default:
      result.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
      break;
  }

  return result;
}

export default function ProductGrid({
  products,
  categories,
}: {
  products: Product[];
  categories: string[];
}) {
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    category: "",
    subcategory: "",
    minPrice: null,
    maxPrice: null,
    minRating: null,
    sort: "featured",
  });

  const filtered = useMemo(
    () => filterAndSort(products, filters),
    [products, filters]
  );

  const productTypes = useMemo<ProductType[]>(() => {
    const grouped = new Map<string, ProductType>();

    products.forEach((product) => {
      const name = productTypeFor(product);
      if (!name) return;
      const existing = grouped.get(name);
      if (existing) {
        existing.count += 1;
      } else {
        grouped.set(name, { name, count: 1, imageUrl: product.imageUrl });
      }
    });

    return [...grouped.values()]
      .filter((type) => type.count >= 2)
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [products]);

  return (
    <>
      {productTypes.length > 1 && (
        <section className="mb-7" aria-labelledby="product-types-heading">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">
                Narrow the collection
              </p>
              <h2 id="product-types-heading" className="mt-1 text-xl font-bold text-gray-950">
                Shop by product type
              </h2>
            </div>
            {filters.subcategory && (
              <button
                type="button"
                onClick={() => setFilters((current) => ({ ...current, subcategory: "" }))}
                className="text-sm font-semibold text-emerald-800 hover:text-emerald-950"
              >
                Show all products
              </button>
            )}
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2" aria-label="Product types">
            {productTypes.map((type) => {
              const active = filters.subcategory === type.name;
              return (
                <button
                  key={type.name}
                  type="button"
                  onClick={() =>
                    setFilters((current) => ({
                      ...current,
                      subcategory: active ? "" : type.name,
                    }))
                  }
                  aria-pressed={active}
                  className={`group flex min-w-48 items-center gap-3 rounded-xl border bg-white p-2.5 text-left shadow-sm transition ${
                    active
                      ? "border-emerald-700 ring-2 ring-emerald-700/15"
                      : "border-gray-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={type.imageUrl}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-lg bg-gray-100 object-cover"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold leading-tight text-gray-900">
                      {type.name}
                    </span>
                    <span className="mt-1 block text-xs text-gray-500">
                      {type.count} product{type.count === 1 ? "" : "s"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <SearchAndFilters
        filters={filters}
        categories={categories}
        onFilterChange={setFilters}
        resultCount={filtered.length}
      />

      {filtered.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-lg font-medium text-gray-500 dark:text-gray-400">
            No products match your filters.
          </p>
          <button
            onClick={() =>
              setFilters({
                search: "",
                category: "",
                subcategory: "",
                minPrice: null,
                maxPrice: null,
                minRating: null,
                sort: "featured",
              })
            }
            className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </>
  );
}
