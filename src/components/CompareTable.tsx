"use client";

import Image from "next/image";
import { Product } from "@/lib/types";

function StarRatingSmall({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`h-3.5 w-3.5 ${rating >= star ? "text-amber-400" : "text-gray-300 dark:text-gray-600"}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-xs text-gray-500">{rating.toFixed(1)}</span>
    </div>
  );
}

function formatReviewCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}K`;
  return String(count);
}

function getBestValue(
  products: Product[],
  getValue: (p: Product) => number,
  mode: "low" | "high"
): string[] {
  const values = products.map(getValue);
  const best = mode === "low" ? Math.min(...values) : Math.max(...values);
  return products.filter((p) => getValue(p) === best).map((p) => p.id);
}

export default function CompareTable({ products }: { products: Product[] }) {
  const allSpecKeys = Array.from(
    new Set(products.flatMap((p) => Object.keys(p.specs)))
  );

  const bestPrice = getBestValue(products, (p) => p.price, "low");
  const bestRating = getBestValue(products, (p) => p.rating, "high");

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
      <table className="w-full min-w-[600px] border-collapse">
        {/* Product images & names */}
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="w-[140px] bg-gray-50 p-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">
              Product
            </th>
            {products.map((p) => (
              <th
                key={p.id}
                className="bg-gray-50 p-4 text-center dark:bg-gray-800/50"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="relative h-28 w-28 overflow-hidden rounded-xl bg-white dark:bg-gray-700">
                    <Image
                      src={p.imageUrl}
                      alt={p.title}
                      fill
                      className="object-cover"
                      sizes="112px"
                    />
                  </div>
                  <span className="line-clamp-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {p.title}
                  </span>
                </div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {/* Price row */}
          <tr className="border-b border-gray-100 dark:border-gray-700/50">
            <td className="p-4 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Price
            </td>
            {products.map((p) => (
              <td key={p.id} className="p-4 text-center">
                <span
                  className={`text-lg font-bold ${bestPrice.includes(p.id) ? "text-green-600 dark:text-green-400" : "text-gray-900 dark:text-white"}`}
                >
                  ${p.price.toFixed(2)}
                </span>
                {p.originalPrice && p.originalPrice > p.price && (
                  <span className="ml-1.5 text-xs text-gray-400 line-through">
                    ${p.originalPrice.toFixed(2)}
                  </span>
                )}
                {bestPrice.includes(p.id) && (
                  <span className="mt-1 block text-xs font-medium text-green-600 dark:text-green-400">
                    Best Price
                  </span>
                )}
              </td>
            ))}
          </tr>

          {/* Rating row */}
          <tr className="border-b border-gray-100 dark:border-gray-700/50">
            <td className="p-4 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Rating
            </td>
            {products.map((p) => (
              <td key={p.id} className="p-4 text-center">
                <div className="flex flex-col items-center gap-1">
                  <StarRatingSmall rating={p.rating} />
                  <span className="text-xs text-gray-400">
                    {formatReviewCount(p.reviewCount)} reviews
                  </span>
                  {bestRating.includes(p.id) && (
                    <span className="text-xs font-medium text-green-600 dark:text-green-400">
                      Highest Rated
                    </span>
                  )}
                </div>
              </td>
            ))}
          </tr>

          {/* Category row */}
          <tr className="border-b border-gray-100 dark:border-gray-700/50">
            <td className="p-4 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Category
            </td>
            {products.map((p) => (
              <td
                key={p.id}
                className="p-4 text-center text-sm text-gray-700 dark:text-gray-300"
              >
                {p.category}
              </td>
            ))}
          </tr>

          {/* Spec rows */}
          {allSpecKeys.map((key) => (
            <tr
              key={key}
              className="border-b border-gray-100 dark:border-gray-700/50"
            >
              <td className="p-4 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {key}
              </td>
              {products.map((p) => (
                <td
                  key={p.id}
                  className="p-4 text-center text-sm text-gray-700 dark:text-gray-300"
                >
                  {p.specs[key] || "—"}
                </td>
              ))}
            </tr>
          ))}

          {/* Action row */}
          <tr>
            <td className="p-4"></td>
            {products.map((p) => (
              <td key={p.id} className="p-4 text-center">
                <a
                  href={p.affiliateUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow sponsored"
                  className="inline-block rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-600"
                >
                  View on Amazon
                </a>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
