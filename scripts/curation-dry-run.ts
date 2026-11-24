import { writeFile } from "node:fs/promises";
import { confidence, curateGuideWithReport } from "../src/lib/guideCuration.ts";
import {
  pinEditorialPicks,
  qualifyingProducts,
  selectEditorialPicks,
} from "../src/lib/productQuality.ts";
import type { Product } from "../src/lib/types.ts";

const workbookId = process.env.GOOGLE_SHEET_WORKBOOK_ID;
const outputPath = process.argv.find((arg) => arg.startsWith("--output="))?.slice(9);
const guideSlugs = [
  "book-lover-gifts-and-reading-accessories-under-15",
  "small-lego-and-creative-gifts-under-20",
  "needoh-sensory-toys-under-25",
];
if (!workbookId) throw new Error("GOOGLE_SHEET_WORKBOOK_ID is required");

async function tab(name: string): Promise<string> {
  const url = `https://docs.google.com/spreadsheets/d/${workbookId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(name)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not read ${name}: HTTP ${response.status}`);
  return response.text();
}

function csvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false;
  for (let index = 0; index < csv.length; index++) {
    const char = csv[index];
    if (char === '"') {
      if (quoted && csv[index + 1] === '"') { field += '"'; index++; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field); field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && csv[index + 1] === "\n") index++;
      row.push(field); if (row.some(Boolean)) rows.push(row);
      row = []; field = "";
    } else field += char;
  }
  row.push(field); if (row.some(Boolean)) rows.push(row);
  return rows;
}
function parseCSV(csv: string): Record<string, string>[] {
  const rows = csvRows(csv);
  const headers = rows.shift()?.map((value) => value.trim().toLowerCase()) || [];
  return rows.map((row) => Object.fromEntries(headers.map((header, index) =>
    [header, String(row[index] || "").trim()])));
}
function productsFromCSV(csv: string): Product[] {
  return parseCSV(csv).map((row, index) => ({
    id: row.id || String(index),
    title: row.title,
    brand: row.brand || undefined,
    description: row.description || "",
    price: Number(row.price.replace(/[$,]/g, "")) || 0,
    originalPrice: Number(row.original_price.replace(/[$,]/g, "")) || undefined,
    rating: Number(row.rating) || 0,
    reviewCount: Number(row.review_count.replace(/,/g, "")) || 0,
    category: row.category || "Other",
    subcategory: row.subcategory || undefined,
    asin: row.asin || undefined,
    imageUrl: row.image_url || "",
    affiliateUrl: "",
    tags: row.tags ? row.tags.split("|") : [],
    featured: /true|yes|✓|✔|1/i.test(row.featured),
    dateAdded: row.date_added || "",
    specs: Object.fromEntries(Object.entries(row)
      .filter(([key, value]) => key.startsWith("spec_") && value)
      .map(([key, value]) => [key.slice(5).replace(/_/g, " "), value])),
    status: /hidden|archived/i.test(row.status) ? row.status.toLowerCase() as "hidden" | "archived" : "active",
  }));
}

const [productCsv, pageProductCsv, landingPageCsv] = await Promise.all([
  tab("Products"), tab("Page Products"), tab("Landing Pages"),
]);
const products = productsFromCSV(productCsv).filter((product) => product.status === "active");
const productByAsin = new Map(products.flatMap((product) =>
  product.asin ? [[product.asin.toUpperCase(), product] as const] : []));
const links = parseCSV(pageProductCsv);
const pages = new Map(parseCSV(landingPageCsv).map((row) => [row.theme_slug, row]));
const reports = guideSlugs.map((slug) => {
  const page = pages.get(slug);
  if (!page) throw new Error(`Guide not found: ${slug}`);
  const candidates = links.filter((row) => row.theme_slug === slug)
    .sort((a, b) => Number(a.display_order || 999) - Number(b.display_order || 999))
    .flatMap((row) => {
      const product = productByAsin.get(String(row.asin).toUpperCase());
      return product ? [product] : [];
    });
  const maxPrice = Number(slug.match(/under-(\d+)$/)?.[1] || 0) || null;
  const report = curateGuideWithReport(qualifyingProducts(candidates, { maxPrice }));
  const editorialPicks = selectEditorialPicks(report.selected, { maxPrice });
  const defaultOrder = pinEditorialPicks(report.selected, editorialPicks);
  return {
    slug,
    title: page.page_title,
    linkedCount: candidates.length,
    qualifyingCount: report.inputCount,
    selectedCount: report.selected.length,
    prunedCount: report.inputCount - report.selected.length,
    defaultOrder: defaultOrder.map((product, index) => ({
      position: index + 1,
      asin: product.asin,
      title: product.title,
      reason: product.bestFor,
      editorialBadge: editorialPicks.find((pick) => pick.productId === product.id)?.badge,
      bayesianScore: Number(confidence(product).toFixed(4)),
      reviews: product.reviewCount,
    })),
    winners: report.selected.map((product) => ({
      asin: product.asin, title: product.title, reason: product.bestFor,
      rating: product.rating, reviews: product.reviewCount, price: product.price,
    })),
    removed: report.removed.map((item) => ({
      asin: item.product.asin, title: item.product.title, reason: item.reason,
      cluster: item.cluster, winnerAsin: item.winner?.asin, winnerTitle: item.winner?.title,
    })),
  };
});
const json = JSON.stringify({ generatedAt: new Date().toISOString(), workbookId, reports }, null, 2);
if (outputPath) await writeFile(outputPath, json + "\n", "utf8");
console.log(json);
