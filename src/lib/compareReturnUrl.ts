const DEFAULT_COMPARE_RETURN_URL = "/products";
const LOCAL_URL_BASE = "https://www.alreadypicked.com";

export function getCompareReturnUrl(value?: string | string[]): string {
  if (typeof value !== "string") return DEFAULT_COMPARE_RETURN_URL;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return DEFAULT_COMPARE_RETURN_URL;
  }

  try {
    const url = new URL(value, LOCAL_URL_BASE);
    if (url.origin !== LOCAL_URL_BASE || url.pathname === "/compare") {
      return DEFAULT_COMPARE_RETURN_URL;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_COMPARE_RETURN_URL;
  }
}
