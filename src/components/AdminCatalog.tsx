"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LandingPage, PageProduct, Product } from "@/lib/types";

type Notice = { kind: "success" | "error"; message: string } | null;
const ADMIN_SESSION_KEY = "themecart-admin-key";

export default function AdminCatalog({
  pages,
  products,
  pageProducts,
}: {
  pages: LandingPage[];
  products: Product[];
  pageProducts: PageProduct[];
}) {
  const router = useRouter();
  const [adminKey, setAdminKey] = useState("");
  const [sessionUnlocked, setSessionUnlocked] = useState(false);
  const [search, setSearch] = useState("");
  const [guide, setGuide] = useState("");
  const [pending, setPending] = useState("");
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    const savedKey = sessionStorage.getItem(ADMIN_SESSION_KEY) || "";
    setAdminKey(savedKey);
    setSessionUnlocked(Boolean(savedKey));
  }, []);

  function lockAdmin() {
    setAdminKey("");
    setSessionUnlocked(false);
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
  }

  async function unlockAdmin() {
    if (!adminKey) {
      setNotice({ kind: "error", message: "Enter your admin key first." });
      return;
    }

    setPending("authenticate");
    setNotice(null);
    try {
      const response = await fetch("/api/admin/catalog", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ action: "authenticate" }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "The key could not be verified.");
      sessionStorage.setItem(ADMIN_SESSION_KEY, adminKey);
      setSessionUnlocked(true);
      setNotice({ kind: "success", message: "Admin unlocked for this browser tab." });
    } catch (error) {
      lockAdmin();
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "The key could not be verified.",
      });
    } finally {
      setPending("");
    }
  }

  const linkedAsins = useMemo(() => {
    if (!guide) return null;
    return new Set(
      pageProducts
        .filter((row) => row.themeSlug === guide)
        .map((row) => row.asin)
    );
  }, [guide, pageProducts]);

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products
      .filter((product) => !linkedAsins || (product.asin && linkedAsins.has(product.asin)))
      .filter(
        (product) =>
          !query ||
          product.title.toLowerCase().includes(query) ||
          product.asin?.toLowerCase().includes(query)
      )
      .slice(0, 100);
  }, [linkedAsins, products, search]);

  async function update(
    id: string,
    payload: Record<string, string | undefined>,
    successMessage: string
  ) {
    if (!adminKey) {
      setNotice({ kind: "error", message: "Enter your admin key first." });
      return;
    }

    setPending(id);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/catalog", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "The change failed.");
      sessionStorage.setItem(ADMIN_SESSION_KEY, adminKey);
      setSessionUnlocked(true);
      setNotice({ kind: "success", message: successMessage });
      window.setTimeout(() => router.refresh(), 250);
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "The change failed.",
      });
    } finally {
      setPending("");
    }
  }

  return (
    <div className="mt-10 space-y-10">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-64 flex-1 text-sm font-semibold text-gray-800">
            Admin key
            <input
              type="password"
              value={adminKey}
              onChange={(event) => {
                setAdminKey(event.target.value);
                setSessionUnlocked(false);
              }}
              placeholder="Enter the private admin key"
              className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-2.5 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
            />
          </label>
          <div className="flex max-w-md items-center gap-3">
            <p className="text-sm leading-6 text-gray-500">
              {sessionUnlocked
                ? "Unlocked for this browser tab. Changes are reversible."
                : "Enter the key once to unlock actions for this browser tab."}
            </p>
            {sessionUnlocked ? (
              <button
                type="button"
                onClick={() => {
                  lockAdmin();
                  setNotice({ kind: "success", message: "Admin session locked." });
                }}
                className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Lock admin
              </button>
            ) : (
              <button
                type="button"
                disabled={!adminKey || Boolean(pending)}
                onClick={unlockAdmin}
                className="shrink-0 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {pending === "authenticate" ? "Checking…" : "Unlock admin"}
              </button>
            )}
          </div>
        </div>
        {notice && (
          <p
            className={`mt-4 rounded-lg px-3 py-2 text-sm ${
              notice.kind === "success"
                ? "bg-emerald-50 text-emerald-800"
                : "bg-red-50 text-red-700"
            }`}
          >
            {notice.message}
          </p>
        )}
      </section>

      <section>
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
            Publishing
          </p>
          <h2 className="mt-1 text-xl font-bold">Manage guides</h2>
        </div>
        <div className="space-y-3">
          {pages.map((page) => {
            const nextStatus = page.status === "published" ? "archived" : "published";
            const actionId = `guide-${page.themeSlug}`;
            return (
              <div
                key={page.themeSlug}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4"
              >
                <div>
                  <h3 className="font-semibold text-gray-950">{page.pageTitle}</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    /{page.themeSlug} · {page.status}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={Boolean(pending)}
                  onClick={() =>
                    update(
                      actionId,
                      { action: "setGuideStatus", slug: page.themeSlug, status: nextStatus },
                      nextStatus === "published" ? "Guide published." : "Guide archived."
                    )
                  }
                  className={`rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50 ${
                    nextStatus === "published"
                      ? "bg-emerald-800 text-white"
                      : "border border-gray-300 text-gray-700"
                  }`}
                >
                  {pending === actionId
                    ? "Saving…"
                    : nextStatus === "published"
                      ? "Publish"
                      : "Archive guide"}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
              Catalog
            </p>
            <h2 className="mt-1 text-xl font-bold">Manage products</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title or ASIN"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-700"
            />
            <select
              value={guide}
              onChange={(event) => setGuide(event.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">All products</option>
              {pages.map((page) => (
                <option key={page.themeSlug} value={page.themeSlug}>
                  {page.pageTitle}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          {visibleProducts.map((product) => {
            const asin = product.asin || "";
            const actionId = `product-${asin}`;
            return (
              <div
                key={product.id}
                className="flex flex-wrap items-center gap-4 border-b border-gray-100 p-3 last:border-b-0"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={product.imageUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />
                <div className="min-w-64 flex-1">
                  <p className="line-clamp-2 text-sm font-semibold text-gray-900">{product.title}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {asin} · {product.status || "active"}
                  </p>
                </div>
                <select
                  value={product.status || "active"}
                  disabled={Boolean(pending)}
                  onChange={(event) =>
                    update(
                      actionId,
                      { action: "setProductStatus", asin, status: event.target.value },
                      "Product visibility updated."
                    )
                  }
                  aria-label={`Visibility for ${product.title}`}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="hidden">Hidden</option>
                  <option value="archived">Archived</option>
                </select>
                {guide && (
                  <button
                    type="button"
                    disabled={Boolean(pending)}
                    onClick={() =>
                      update(
                        `${actionId}-${guide}`,
                        { action: "removeProductFromGuide", asin, slug: guide },
                        "Product removed from this guide."
                      )
                    }
                    className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"
                  >
                    Remove from guide
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {visibleProducts.length === 100 && (
          <p className="mt-3 text-sm text-gray-500">
            Showing the first 100 matches. Search or select a guide to narrow the list.
          </p>
        )}
      </section>
    </div>
  );
}
