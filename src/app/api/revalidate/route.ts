import { revalidatePath, revalidateTag } from "next/cache";
import { CATALOG_CACHE_TAG, CATALOG_PATHS } from "@/lib/cache";

const NOINDEX_HEADERS = { "X-Robots-Tag": "noindex" };

function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, {
    ...init,
    headers: { ...NOINDEX_HEADERS, ...init?.headers },
  });
}

/**
 * Called by the Google Apps Script bound to the workbook whenever a row
 * changes, so edits typed straight into the Sheet reach the site immediately
 * instead of waiting out the hourly cache.
 *
 * Auth reuses the token the Sheet already holds as EXPORT_TOKEN (the site
 * knows it as GOOGLE_SHEETS_ADMIN_TOKEN), so there is no second secret to keep
 * in sync. Set REVALIDATE_TOKEN if you would rather it had its own.
 */
export async function POST(request: Request) {
  const expected =
    process.env.REVALIDATE_TOKEN || process.env.GOOGLE_SHEETS_ADMIN_TOKEN;

  if (!expected) {
    return json({ error: "Revalidation is not configured." }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as
    | { token?: string; slug?: string }
    | null;

  const supplied = request.headers.get("x-revalidate-token") || body?.token;
  if (!supplied || supplied !== expected) {
    return json({ error: "Unauthorized." }, { status: 401 });
  }

  // "max" keeps stale-while-revalidate behaviour: readers are served the old
  // copy for the moment it takes the fresh one to render, rather than blocking.
  revalidateTag(CATALOG_CACHE_TAG, "max");
  CATALOG_PATHS.forEach((path) => revalidatePath(path));

  if (body?.slug) {
    revalidatePath(`/${body.slug}`);
    revalidatePath(`/themes/${body.slug}`);
  }

  return json({ ok: true, revalidated: new Date().toISOString() });
}
