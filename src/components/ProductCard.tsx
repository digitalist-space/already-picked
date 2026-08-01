"use client";

import Image from "next/image";
import { Product } from "@/lib/types";
import { useCompare } from "./CompareContext";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => {
          const fill = Math.min(1, Math.max(0, rating - (star - 1)));
          return (
            <svg
              key={star}
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="none"
            >
              <defs>
                <linearGradient id={`star-fill-${star}-${rating}`}>
                  <stop offset={`${fill * 100}%`} stopColor="#f59e0b" />
                  <stop offset={`${fill * 100}%`} stopColor="#d1d5db" />
                </linearGradient>
              </defs>
              <path
                d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                fill={`url(#star-fill-${star}-${rating})`}
              />
            </svg>
          );
        })}
      </div>
      <span className="text-sm text-gray-500 dark:text-gray-400">
        ({rating.toFixed(1)})
      </span>
    </div>
  );
}

function formatReviewCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}K reviews`;
  }
  return `${count} reviews`;
}

function DiscountBadge({
  price,
  originalPrice,
}: {
  price: number;
  originalPrice: number;
}) {
  const discount = Math.round(
    ((originalPrice - price) / originalPrice) * 100
  );
  return (
    <span className="absolute top-3 left-3 rounded-full bg-red-500 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
      -{discount}%
    </span>
  );
}

export default function ProductCard({ product }: { product: Product }) {
  const { toggle, isSelected, selected } = useCompare();
  const checked = isSelected(product.id);
  const atLimit = selected.length >= 4 && !checked;

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 dark:bg-gray-800 ${checked ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-gray-200 dark:border-gray-700"}`}
    >
      <div className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-700">
        {product.originalPrice && product.originalPrice > product.price && (
          <DiscountBadge
            price={product.price}
            originalPrice={product.originalPrice}
          />
        )}
        {product.featured && (
          <span className="absolute top-3 right-3 rounded-full bg-amber-400 px-2.5 py-1 text-xs font-bold text-amber-900 shadow-sm">
            Featured
          </span>
        )}
        <Image
          src={product.imageUrl}
          alt={product.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
      </div>

      <div className="flex flex-1 flex-col p-4">
        <span className="mb-1 text-xs font-medium uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
          {product.category}
          {product.subcategory && ` · ${product.subcategory}`}
        </span>

        <h3 className="mb-2 line-clamp-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
          {product.title}
        </h3>

        <p className="mb-3 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
          {product.description}
        </p>

        <div className="mb-2">
          <StarRating rating={product.rating} />
          <span className="mt-0.5 block text-xs text-gray-400 dark:text-gray-500">
            {formatReviewCount(product.reviewCount)}
          </span>
        </div>

        <div className="mt-auto space-y-2 pt-2">
          <div className="flex items-end justify-between">
            <div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                ${product.price.toFixed(2)}
              </span>
              {product.originalPrice &&
                product.originalPrice > product.price && (
                  <span className="ml-2 text-sm text-gray-400 line-through">
                    ${product.originalPrice.toFixed(2)}
                  </span>
                )}
            </div>
            <a
              href={product.affiliateUrl}
              target="_blank"
              rel="noopener noreferrer nofollow sponsored"
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-600 active:bg-amber-700"
            >
              View Deal
            </a>
          </div>

          <button
            onClick={() => toggle(product)}
            disabled={atLimit}
            className={`flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              checked
                ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                : atLimit
                  ? "cursor-not-allowed border-gray-200 text-gray-300 dark:border-gray-700 dark:text-gray-600"
                  : "border-gray-200 text-gray-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-gray-600 dark:text-gray-400 dark:hover:border-indigo-500 dark:hover:bg-indigo-900/20 dark:hover:text-indigo-300"
            }`}
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {checked ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              )}
            </svg>
            {checked ? "Added to Compare" : "Add to Compare"}
          </button>
        </div>
      </div>
    </div>
  );
}
