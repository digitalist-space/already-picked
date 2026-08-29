"use client";

type LoaderArgs = {
  src: string;
  width: number;
  quality?: number;
};

/**
 * Custom next/image loader.
 *
 * We deliberately do NOT use Vercel's /_next/image optimizer: this catalog
 * renders 100+ remote product images per page, which burns through the image
 * optimization allowance and makes the endpoint return 402
 * (OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED) — every image on the site breaks.
 *
 * Amazon's CDN already serves pre-resized derivatives, so we ask it for the
 * size we need and let the browser load it directly. Everything else is
 * passed through untouched.
 */
export default function imageLoader({ src, width }: LoaderArgs): string {
  if (!src) return src;

  // Local assets (e.g. /placeholder.svg) — serve as-is.
  if (src.startsWith("/")) return src;

  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return src;
  }

  if (url.hostname.endsWith("media-amazon.com")) {
    // Amazon encodes size directives between `._` and the file extension,
    // e.g. .../I/81aBl8vugdL._AC_SL1500_.jpg  ->  .../I/81aBl8vugdL._AC_UL640_.jpg
    const size = Math.min(Math.max(width, 160), 1500);
    url.pathname = url.pathname.replace(
      /(\/[^/]+?)(\._[^/]*)?(\.[a-z0-9]+)$/i,
      `$1._AC_UL${size}_$3`
    );
    return url.toString();
  }

  if (url.hostname === "images.unsplash.com") {
    url.searchParams.set("w", String(width));
    url.searchParams.set("auto", "format");
    return url.toString();
  }

  return src;
}
