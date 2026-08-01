import { revalidatePath } from "next/cache";

const ALLOWED_ACTIONS = new Set([
  "authenticate",
  "setProductStatus",
  "removeProductFromGuide",
  "setGuideStatus",
]);

export async function POST(request: Request) {
  const configuredAdminKey = process.env.THEMECART_ADMIN_KEY;

  if (!configuredAdminKey) {
    return Response.json(
      { error: "The admin key is not configured yet." },
      { status: 503 }
    );
  }

  const adminKey = request.headers.get("x-admin-key");
  if (!adminKey || adminKey !== configuredAdminKey) {
    return Response.json({ error: "Incorrect admin key." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { action?: string; asin?: string; slug?: string; status?: string }
    | null;

  if (!body?.action || !ALLOWED_ACTIONS.has(body.action)) {
    return Response.json({ error: "Unsupported admin action." }, { status: 400 });
  }

  if (body.action === "authenticate") {
    return Response.json({ ok: true });
  }

  const endpoint = process.env.GOOGLE_SHEETS_WEB_APP_URL;
  const receiverToken = process.env.GOOGLE_SHEETS_ADMIN_TOKEN;
  if (!endpoint || !receiverToken) {
    return Response.json(
      { error: "Admin changes are not connected yet." },
      { status: 503 }
    );
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      token: receiverToken,
      action: body.action,
      asin: body.asin,
      slug: body.slug,
      status: body.status,
    }),
    cache: "no-store",
  });

  const result = (await response.json().catch(() => null)) as
    | { ok?: boolean; error?: string }
    | null;

  if (!response.ok || !result?.ok) {
    return Response.json(
      { error: result?.error || "Google Sheets did not accept the change." },
      { status: 502 }
    );
  }

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/admin");
  if (body.slug) {
    revalidatePath(`/${body.slug}`);
    revalidatePath(`/themes/${body.slug}`);
  }

  return Response.json(result);
}
