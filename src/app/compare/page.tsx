import type { Metadata } from "next";
import { getProducts } from "@/lib/products";
import CompareTable from "@/components/CompareTable";
import Link from "next/link";
import { getCompareReturnUrl } from "@/lib/compareReturnUrl";
import { pluralizedCount } from "@/lib/productPresentation";
import { qualifyingProducts } from "@/lib/productQuality";

export const metadata: Metadata = {
  title: "Compare Products",
  description: "Compare selected products side by side on AlreadyPicked.",
  alternates: { canonical: "/compare" },
};

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{
    ids?: string;
    returnTo?: string | string[];
    showExcluded?: string;
  }>;
}) {
  const { ids, returnTo, showExcluded } = await searchParams;
  const returnUrl = getCompareReturnUrl(returnTo);
  const allProducts = await getProducts();
  const idList = ids?.split(",") || [];
  const selectedProducts = idList
    .map((id) => allProducts.find((p) => p.id === id))
    .filter(Boolean) as typeof allProducts;
  const qualifying = qualifyingProducts(selectedProducts);
  const excludedCount = selectedProducts.length - qualifying.length;
  const showingExcluded = showExcluded === "1";
  const products = showingExcluded ? selectedProducts : qualifying;
  const compareParams = new URLSearchParams();
  if (ids) compareParams.set("ids", ids);
  if (returnUrl !== "/products") compareParams.set("returnTo", returnUrl);
  if (!showingExcluded) compareParams.set("showExcluded", "1");
  const qualityToggleUrl = `/compare?${compareParams.toString()}`;

  const qualityNotice = excludedCount > 0 && (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-950">
      <span>
        {showingExcluded
          ? "Showing every selected product, including items below our review standards."
          : `${pluralizedCount(excludedCount, "product")} hidden for having a rating below 3.8 or fewer than 5 reviews.`}
      </span>
      <Link
        href={qualityToggleUrl}
        className="font-semibold underline decoration-amber-400 underline-offset-4"
      >
        {showingExcluded ? "Hide excluded products" : "Show excluded products"}
      </Link>
    </div>
  );

  if (products.length < 2) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 lg:px-8">
        {qualityNotice}
        <h1 className="text-2xl font-bold">Product Comparison</h1>
        <p className="mt-4 text-gray-500 dark:text-gray-400">
          Select at least 2 products to compare. Go back and use the &quot;Add
          to Compare&quot; buttons on product cards.
        </p>
        <Link
          href={returnUrl}
          className="mt-6 inline-block rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Product Comparison
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Comparing {products.length} products side by side
          </p>
        </div>
        <Link
          href={returnUrl}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Back to Products
        </Link>
      </div>

      {qualityNotice}

      <CompareTable products={products} />
    </div>
  );
}
