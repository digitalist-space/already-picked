"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCompare } from "./CompareContext";

export default function CompareBar() {
  const { selected, toggle, clear } = useCompare();
  const pathname = usePathname();

  if (selected.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 shadow-2xl backdrop-blur-lg dark:border-gray-700 dark:bg-gray-800/95">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <span className="shrink-0 text-sm font-medium text-gray-500 dark:text-gray-400">
          Compare ({selected.length}/4):
        </span>

        <div className="flex flex-1 items-center gap-2 overflow-x-auto">
          {selected.map((product) => (
            <div
              key={product.id}
              className="flex shrink-0 items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5 text-sm dark:bg-gray-700"
            >
              <Image
                src={product.imageUrl}
                alt=""
                width={24}
                height={24}
                className="rounded object-cover"
              />
              <span className="max-w-[120px] truncate text-gray-700 dark:text-gray-300">
                {product.title}
              </span>
              <button
                onClick={() => toggle(product)}
                className="ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                x
              </button>
            </div>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={clear}
            className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            Clear
          </button>
          {selected.length >= 2 && (
            <Link
              href={{
                pathname: "/compare",
                query: {
                  ids: selected.map((p) => p.id).join(","),
                  returnTo: pathname,
                },
              }}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
            >
              Compare {selected.length} Products
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
