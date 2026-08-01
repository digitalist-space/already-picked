import type { Metadata } from "next";
import Link from "next/link";
import {
  getAllProductsForAdmin,
  getLandingPagesForAdmin,
  getPageProductsForAdmin,
} from "@/lib/products";
import AdminCatalog from "@/components/AdminCatalog";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const [pages, products, pageProducts] = await Promise.all([
    getLandingPagesForAdmin(),
    getAllProductsForAdmin(),
    getPageProductsForAdmin(),
  ]);

  const statusColors: Record<string, string> = {
    published:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    draft:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    archived:
      "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Admin Dashboard
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Landing pages are managed in the{" "}
            <a
              href="https://docs.google.com/spreadsheets/d/1vicbagFM6DZO7Kyh9EvHPAj9j3H86Rh9L1th-TpuEQM/edit"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Google Sheet
            </a>
          </p>
        </div>
        <Link
          href="/"
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          View Site
        </Link>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">
          Landing Pages{" "}
          <span className="text-sm font-normal text-gray-400">
            ({pages.length})
          </span>
        </h2>

        {pages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 py-12 text-center dark:border-gray-600">
            <p className="text-gray-400">
              No landing pages found. Add rows to the &quot;Landing Pages&quot;
              tab in the Google Sheet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pages.map((page) => (
              <div
                key={page.themeSlug}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {page.pageTitle}
                    </h3>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[page.status] || statusColors.draft}`}
                    >
                      {page.status}
                    </span>
                  </div>
                  {page.introCopy && (
                    <p className="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400">
                      {page.introCopy}
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                    <span>/themes/{page.themeSlug}</span>
                    {page.affiliateTag && (
                      <span>tag: {page.affiliateTag}</span>
                    )}
                    {page.primaryCategory && (
                      <span>{page.primaryCategory}</span>
                    )}
                  </div>
                </div>
                <div className="ml-4 flex items-center gap-2">
                  {page.status === "published" ? (
                    <Link
                      href={`/themes/${page.themeSlug}`}
                      target="_blank"
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      View
                    </Link>
                  ) : (
                    <span className="rounded-lg border border-gray-100 px-3 py-1.5 text-xs text-gray-300 dark:border-gray-700 dark:text-gray-600">
                      {page.status === "draft" ? "Not published" : "Archived"}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <AdminCatalog pages={pages} products={products} pageProducts={pageProducts} />
    </div>
  );
}
