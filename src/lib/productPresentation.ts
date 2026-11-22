import type { Product } from "./types";

const MAX_PRODUCT_HOOK_LENGTH = 85;
const BOILERPLATE_HOOK_SUFFIXES = [
  /offers compact hands-on creative building play\.?$/i,
  /for quick group play\.?$/i,
  /for everyday tabletop protection\.?$/i,
];

export function preferredSourceTitle(
  sheetTitle: string,
  ...alternatives: Array<string | undefined>
): string {
  const title = sheetTitle?.trim() || "";
  const alternativeTitle = alternatives
    .map((value) => value?.trim() || "")
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)[0];
  const titleWords = title.split(/\s+/).filter(Boolean);
  const looksBrandOnly = title.length <= 24 && titleWords.length <= 2;

  if (
    (!title || looksBrandOnly) &&
    alternativeTitle &&
    alternativeTitle.split(/\s+/).filter(Boolean).length >= 3
  ) {
    return alternativeTitle;
  }

  return title || alternativeTitle || "Untitled Product";
}

export function pluralizedCount(
  count: number,
  singular: string,
  plural = `${singular}s`
): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function editorialProductTitle(rawTitle: string): string {
  const pipeParts = rawTitle
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
  const firstPipePart = pipeParts[0] || rawTitle.trim();
  const firstPartWords = firstPipePart.split(/\s+/).filter(Boolean);
  const firstPartLooksBrandOnly =
    firstPipePart.length <= 24 && firstPartWords.length <= 2;
  const secondPipePart = pipeParts[1] || "";
  const withoutPipe =
    firstPartLooksBrandOnly &&
    secondPipePart &&
    secondPipePart.length <= 80 &&
    secondPipePart.split(/\s+/).filter(Boolean).length >= 2
      ? `${firstPipePart} ${secondPipePart}`
      : firstPipePart;
  const withoutTrailingParentheses = withoutPipe
    .replace(/\s*\([^)]*\)\s*$/g, "")
    .trim();
  const commaParts = withoutTrailingParentheses
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const withoutKeywordTail =
    commaParts.length >= 3 && commaParts[0].length >= 24
      ? commaParts[0]
      : withoutTrailingParentheses;

  if (withoutKeywordTail.length <= 96) return withoutKeywordTail;
  const clipped = withoutKeywordTail.slice(0, 93).replace(/\s+\S*$/, "");
  return `${clipped || withoutKeywordTail.slice(0, 93).trim()}…`;
}

function cleanHookText(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/^[\s•·*\-–—]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function removeRepeatedTitle(value: string, title: string): string {
  const titleVariants = [title, editorialProductTitle(title)]
    .map(cleanHookText)
    .sort((a, b) => b.length - a.length);
  let result = cleanHookText(value);

  for (const titleVariant of titleVariants) {
    if (
      titleVariant &&
      result.toLocaleLowerCase().startsWith(titleVariant.toLocaleLowerCase())
    ) {
      result = result.slice(titleVariant.length).replace(/^[\s:;,|\-–—.]+/, "");
      break;
    }
  }

  return cleanHookText(result);
}

function clampHook(value: string): string {
  if (value.length <= MAX_PRODUCT_HOOK_LENGTH) return value;
  const clipped = value
    .slice(0, MAX_PRODUCT_HOOK_LENGTH - 1)
    .replace(/\s+\S*$/, "")
    .replace(/[,:;\-–—]+$/, "")
    .trim();
  return `${clipped || value.slice(0, MAX_PRODUCT_HOOK_LENGTH - 1).trim()}…`;
}

function isUsableHook(value: string): boolean {
  const cleaned = cleanHookText(value);
  if (!cleaned || /^[a-z]/.test(cleaned)) return false;
  if (cleaned.split(/\s+/).filter(Boolean).length < 4) return false;
  return !BOILERPLATE_HOOK_SUFFIXES.some((pattern) => pattern.test(cleaned));
}

function hookFromSpecs(specs: Record<string, string>): string {
  const preferredKeys = [
    /player|people|participant/i,
    /age/i,
    /material/i,
    /capacity|count|pieces/i,
    /size|dimension/i,
    /use|occasion/i,
  ];
  const entries = Object.entries(specs).filter(([, value]) => value?.trim());
  const selected: Array<[string, string]> = [];

  for (const pattern of preferredKeys) {
    const match = entries.find(
      ([key]) => pattern.test(key) && !selected.some(([used]) => used === key)
    );
    if (match) selected.push(match);
    if (selected.length === 2) break;
  }

  return selected.map(([key, value]) => `${key}: ${value}`).join(" · ");
}

function matchesGuideDescription(value: string, guideDescription?: string): boolean {
  if (!guideDescription?.trim()) return false;
  const normalize = (text: string) =>
    cleanHookText(text)
      .toLocaleLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .replace(/\s+/g, " ")
      .trim();
  const candidate = normalize(value);
  const guide = normalize(guideDescription);
  if (!candidate || !guide) return false;
  if (candidate === guide) return true;

  const sharedPrefixLength = Math.min(candidate.length, guide.length);
  return (
    sharedPrefixLength >= 40 &&
    (candidate.startsWith(guide) || guide.startsWith(candidate))
  );
}

export function getProductHook(product: Product): string | undefined {
  const candidates = [
    product.shortHook || "",
    product.description?.split(/(?<=[.!?])\s+/)[0] || "",
    hookFromSpecs(product.specs || {}),
    product.editorialNote || "",
  ];

  for (const candidate of candidates) {
    if (!isUsableHook(candidate)) continue;
    if (matchesGuideDescription(candidate, product.guideDescription)) continue;
    const cleaned = removeRepeatedTitle(candidate, product.title);
    if (
      isUsableHook(cleaned) &&
      cleaned.toLocaleLowerCase() !==
        editorialProductTitle(product.title).toLocaleLowerCase()
    ) {
      return clampHook(cleaned);
    }
  }
}
