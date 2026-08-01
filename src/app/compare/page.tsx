import type { Metadata } from "next";
import { getProducts } from "@/lib/products";
import CompareTable from "@/components/CompareTable";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Compare Products",
  description: "Compare selected products side by side on AlreadyPicked.",
  alternates: { canonical: "/compare" },
};

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { ids } = await searchParams;
  const allProducts = await getProducts();
  const idList = ids?.split(",") || [];
  const products = idList
    .map((id) => allProducts.find((p) => p.id === id))
    .filter(Boolean) as typeof allProducts;

  if (products.length < 2) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold">Product Comparison</h1>
        <p className="mt-4 text-gray-500 dark:text-gray-400">
          Select at least 2 products to compare. Go back and use the &quot;Add
          to Compare&quot; buttons on product cards.
        </p>
        <Link
          href="/products"
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
          href="/products"
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Back to Products
        </Link>
      </div>

      <CompareTable products={products} />
    </div>
  );
}
