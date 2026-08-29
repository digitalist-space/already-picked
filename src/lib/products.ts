import { Product, LandingPage, PageProduct } from "./types";

const WORKBOOK_ID = process.env.GOOGLE_SHEET_WORKBOOK_ID;
const ASSOCIATE_TAG = process.env.AMAZON_ASSOCIATE_TAG || "digitalist0d-20";

export function normalizeCategory(value: string): string {
  const category = String(value || "").trim();
  const normalized = category.toLowerCase();

  if (
    normalized.includes("clean") ||
    normalized.includes("pink stuff") ||
    normalized.includes("household")
  ) {
    return "Home Cleaning";
  }

  return category || "Other";
}

function buildAffiliateUrl(asin: string, tag?: string): string {
  const t = tag || ASSOCIATE_TAG;
  return `https://www.amazon.com/dp/${asin}?tag=${t}&linkCode=ll1`;
}

function parseCSVRow(row: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"') {
      if (inQuotes && row[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

function splitCSVIntoRows(csv: string): string[] {
  const rows: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    if (char === '"') {
      if (inQuotes && csv[i + 1] === '"') {
        current += '""';
        i++;
      } else {
        inQuotes = !inQuotes;
        current += char;
      }
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && csv[i + 1] === "\n") i++;
      if (current.trim()) rows.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) rows.push(current);
  return rows;
}

function parseCSV(csv: string): Record<string, string>[] {
  const rows = splitCSVIntoRows(csv);
  if (rows.length < 2) return [];

  const headers = parseCSVRow(rows[0]).map((h) => h.toLowerCase().trim());

  return rows.slice(1).map((row) => {
    const values = parseCSVRow(row);
    const record: Record<string, string> = {};
    headers.forEach((header, i) => {
      record[header] = values[i] || "";
    });
    return record;
  });
}

function parsePrice(val: string): number {
  return parseFloat(val.replace(/[$,]/g, "")) || 0;
}

function isTruthy(val: string): boolean {
  const v = val.toLowerCase().trim();
  return v === "true" || v === "yes" || v === "✓" || v === "1";
}

function normalizedImageKey(imageUrl: string): string {
  const value = String(imageUrl || "").trim().toLowerCase();
  if (!value || value.includes("placeholder")) return "";
  try {
    const url = new URL(value);
    // Amazon inserts resize/crop instructions between `._` and the extension.
    // Removing them makes differently sized copies of the same product image
    // resolve to one stable image identity.
    const pathname = url.pathname.replace(/\._[^/]+(?=\.[a-z0-9]+$)/i, "");
    return `${url.hostname}${pathname}`;
  } catch {
    return value.replace(/[?#].*$/, "").replace(/\._[^/]+(?=\.[a-z0-9]+$)/i, "");
  }
}

const DEDUPE_STOP_WORDS = new Set([
  "a", "an", "and", "for", "from", "in", "of", "on", "or", "the", "to",
  "with", "gift", "gifts", "new", "best", "cute", "set", "pack",
]);

function titleTokens(title: string): Set<string> {
  return new Set(
    String(title || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .split(/\s+/)
      .filter((token) => token.length > 1 && !DEDUPE_STOP_WORDS.has(token))
  );
}

function titleSimilarity(a: Product, b: Product): number {
  if (a.category !== b.category) return 0;
  const left = titleTokens(a.title);
  const right = titleTokens(b.title);
  if (left.size < 4 || right.size < 4) return 0;
  let intersection = 0;
  for (const token of left) if (right.has(token)) intersection++;
  return intersection / (left.size + right.size - intersection);
}

function preferredDuplicate(a: Product, b: Product): Product {
  if (a.reviewCount !== b.reviewCount) {
    return a.reviewCount > b.reviewCount ? a : b;
  }
  if (a.rating !== b.rating) return a.rating > b.rating ? a : b;
  return a;
}

export function dedupeProducts(products: Product[]): Product[] {
  const exactGroups = new Map<string, Product>();
  const withoutStableImage: Product[] = [];

  for (const product of products) {
    const imageKey = normalizedImageKey(product.imageUrl);
    // ASIN remains useful when the same listing was imported more than once.
    const key = imageKey ? `image:${imageKey}` : product.asin ? `asin:${product.asin}` : "";
    if (!key) {
      withoutStableImage.push(product);
      continue;
    }
    const existing = exactGroups.get(key);
    exactGroups.set(key, existing ? preferredDuplicate(existing, product) : product);
  }

  const candidates = [...exactGroups.values(), ...withoutStableImage];
  const kept: Product[] = [];
  for (const product of candidates) {
    const similarIndex = kept.findIndex(
      (candidate) => titleSimilarity(candidate, product) >= 0.86
    );
    if (similarIndex === -1) kept.push(product);
    else kept[similarIndex] = preferredDuplicate(kept[similarIndex], product);
  }
  return kept;
}

function rowToProduct(
  row: Record<string, string>,
  index: number,
  affiliateTag?: string
): Product {
  const asin = row.asin || undefined;
  const normalizedStatus = row.status?.toLowerCase().trim();
  const status =
    normalizedStatus === "hidden" || normalizedStatus === "archived"
      ? normalizedStatus
      : "active";
  return {
    id: row.id || `product-${index}`,
    title: row.title || "Untitled Product",
    description: row.description || "",
    price: parsePrice(row.price),
    originalPrice: row.original_price
      ? parsePrice(row.original_price)
      : undefined,
    rating: Math.min(5, Math.max(0, parseFloat(row.rating) || 0)),
    reviewCount: parseInt(row.review_count?.replace(/,/g, "")) || 0,
    category: normalizeCategory(row.category),
    subcategory: row.subcategory || undefined,
    asin,
    imageUrl: row.image_url || "/placeholder.svg",
    affiliateUrl: asin ? buildAffiliateUrl(asin, affiliateTag) : "#",
    tags: row.tags ? row.tags.split("|").map((t: string) => t.trim()) : [],
    featured: isTruthy(row.featured || ""),
    dateAdded: row.date_added || new Date().toISOString().split("T")[0],
    specs: Object.entries(row).reduce(
      (acc, [key, value]) => {
        if (key.startsWith("spec_") && value) {
          const label = key
            .slice(5)
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
          acc[label] = value;
        }
        return acc;
      },
      {} as Record<string, string>
    ),
    status,
  };
}

// --- Google Sheet fetching (3-tab workbook) ---

function sheetURL(tabName: string): string {
  return `https://docs.google.com/spreadsheets/d/${WORKBOOK_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
}

async function fetchTab(
  tabName: string,
  revalidate: number = 3600
): Promise<Record<string, string>[]> {
  if (!WORKBOOK_ID) return [];
  const res = await fetch(
    sheetURL(tabName),
    revalidate === 0
      ? { cache: "no-store" }
      : { next: { revalidate } }
  );
  if (!res.ok) {
    console.error(`Failed to fetch tab "${tabName}": ${res.status}`);
    return [];
  }
  const csv = await res.text();
  const csvRows = splitCSVIntoRows(csv);
  const headers = csvRows.length
    ? parseCSVRow(csvRows[0]).map((header) => header.toLowerCase().trim())
    : [];
  const requiredHeaders: Record<string, string[]> = {
    Products: ["id", "title", "asin", "status"],
    "Landing Pages": ["theme_slug", "page_title", "status"],
    "Page Products": ["theme_slug", "asin"],
  };
  const missingHeaders = (requiredHeaders[tabName] || []).filter(
    (header) => !headers.includes(header)
  );
  if (missingHeaders.length) {
    console.error(
      `Invalid Google Sheet tab "${tabName}": missing header(s) ${missingHeaders.join(", ")}`
    );
    return [];
  }
  return parseCSV(csv);
}

function rowToLandingPage(row: Record<string, string>): LandingPage {
  const status = row.status?.toLowerCase().trim();
  return {
    themeSlug: row.theme_slug || "",
    pageTitle: row.page_title || "",
    seoTitle: row.seo_title || "",
    metaDescription: row.meta_description || "",
    pageHeading: row.page_heading || "",
    introCopy: row.intro_copy || "",
    aboutCopy: row.about_copy || "",
    primaryCategory: normalizeCategory(row.primary_category),
    status:
      status === "published" || status === "archived" ? status : "draft",
    affiliateTag: row.affiliate_tag || "",
    heroImageUrl: row.hero_image_url || "",
    createdDate: row.created_date || "",
    updatedDate: row.updated_date || "",
  };
}

function rowToPageProduct(row: Record<string, string>): PageProduct {
  return {
    themeSlug: row.theme_slug || "",
    asin: row.asin || "",
    displayOrder: parseInt(row.display_order) || 999,
    featured: isTruthy(row.featured || ""),
    editorialNote: row.editorial_note || "",
    dateAdded: row.date_added || "",
  };
}

// --- Public API ---

export async function getAllProducts(
  affiliateTag?: string
): Promise<Product[]> {
  // Cached for an hour so guide pages can be prerendered. Visibility changes
  // made through the admin screen call revalidatePath() and take effect at
  // once; edits typed straight into the Sheet appear within the hour. The
  // *ForAdmin readers below stay uncached so the admin screen is always live.
  const rows = await fetchTab("Products");
  if (rows.length === 0) return SAMPLE_PRODUCTS;
  return dedupeProducts(rows
    .map((r, i) => rowToProduct(r, i, affiliateTag))
    .filter((product) => product.status === "active"));
}

export async function getAllProductsForAdmin(): Promise<Product[]> {
  const rows = await fetchTab("Products", 0);
  if (rows.length === 0) return [];
  return rows.map((r, i) => rowToProduct(r, i));
}

export async function getLandingPages(): Promise<LandingPage[]> {
  const rows = await fetchTab("Landing Pages");
  return rows.map(rowToLandingPage).filter((p) => p.themeSlug);
}

export async function getLandingPagesForAdmin(): Promise<LandingPage[]> {
  const rows = await fetchTab("Landing Pages", 0);
  return rows.map(rowToLandingPage).filter((p) => p.themeSlug);
}

export async function getPublishedLandingPages(): Promise<LandingPage[]> {
  const pages = await getLandingPages();
  return pages.filter((p) => p.status === "published");
}

export async function getLandingPage(
  slug: string
): Promise<LandingPage | undefined> {
  const pages = await getLandingPages();
  return pages.find((p) => p.themeSlug === slug);
}

export async function getPageProducts(): Promise<PageProduct[]> {
  const rows = await fetchTab("Page Products");
  return rows.map(rowToPageProduct).filter((pp) => pp.themeSlug && pp.asin);
}

export async function getPageProductsForAdmin(): Promise<PageProduct[]> {
  const rows = await fetchTab("Page Products", 0);
  return rows.map(rowToPageProduct).filter((pp) => pp.themeSlug && pp.asin);
}

export async function getLandingPageProducts(
  slug: string,
  affiliateTag?: string
): Promise<Product[]> {
  const [allProducts, pageProducts] = await Promise.all([
    getAllProducts(affiliateTag),
    getPageProducts(),
  ]);

  const productsByAsin = new Map<string, Product>();
  for (const p of allProducts) {
    if (p.asin) productsByAsin.set(p.asin, p);
  }

  const pageRows = pageProducts
    .filter((pp) => pp.themeSlug === slug)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  return pageRows.reduce<Product[]>((matched, pp) => {
      const product = productsByAsin.get(pp.asin);
      if (!product) return matched;
      matched.push({
        ...product,
        featured: pp.featured,
        editorialNote: pp.editorialNote || undefined,
        affiliateUrl: buildAffiliateUrl(pp.asin, affiliateTag),
      });
      return matched;
    }, []);
}

// Legacy compat — used by homepage and compare page
export async function getProducts(): Promise<Product[]> {
  return getAllProducts();
}

export function parseCSVToProducts(csv: string): Product[] {
  const rows = parseCSV(csv);
  return rows.map((r, i) => rowToProduct(r, i));
}

export function getCategories(products: Product[]): string[] {
  const categories = new Set(products.map((p) => p.category));
  return Array.from(categories).sort();
}

export function getPriceRange(products: Product[]): {
  min: number;
  max: number;
} {
  const prices = products.map((p) => p.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

const SAMPLE_PRODUCTS: Product[] = [
  {
    id: "1",
    title: "FEZIBO Standing Desk with Keyboard Tray",
    description:
      '48-inch electric standing desk with smooth height adjustment from 27.5" to 46.5". Splice board design, sturdy steel frame, and built-in cable management.',
    price: 139.99,
    originalPrice: 199.99,
    rating: 4.6,
    reviewCount: 34521,
    category: "Desks",
    asin: "B0B3MZWK3H",
    imageUrl:
      "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=400&h=400&fit=crop",
    affiliateUrl: buildAffiliateUrl("B0B3MZWK3H"),
    tags: ["standing-desk", "electric", "adjustable"],
    featured: true,
    dateAdded: "2026-07-15",
    specs: {
      Dimensions: '48 x 24 x 27.5-46.5"',
      Weight: "52 lbs",
      Material: "Particleboard + Steel",
      "Weight Capacity": "154 lbs",
      Motor: "Single motor",
      "Color Options": "4",
    },
  },
];
