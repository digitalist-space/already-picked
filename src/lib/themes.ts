import fs from "fs";
import path from "path";
import { Product } from "./types";
import { parseCSVToProducts } from "./products";

const DATA_DIR = path.join(process.cwd(), "data");
const THEMES_FILE = path.join(DATA_DIR, "themes.json");
const THEMES_CSV_DIR = path.join(DATA_DIR, "themes");

export interface Theme {
  name: string;
  slug: string;
  description: string;
  createdAt: string;
  productCount: number;
}

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(THEMES_CSV_DIR))
    fs.mkdirSync(THEMES_CSV_DIR, { recursive: true });
}

export function getThemes(): Theme[] {
  ensureDirs();
  if (!fs.existsSync(THEMES_FILE)) return [];
  return JSON.parse(fs.readFileSync(THEMES_FILE, "utf-8"));
}

function saveThemes(themes: Theme[]) {
  ensureDirs();
  fs.writeFileSync(THEMES_FILE, JSON.stringify(themes, null, 2));
}

export function createTheme(
  name: string,
  slug: string,
  description: string
): Theme {
  const themes = getThemes();
  if (themes.some((t) => t.slug === slug)) {
    throw new Error(`Theme with slug "${slug}" already exists`);
  }
  const theme: Theme = {
    name,
    slug,
    description,
    createdAt: new Date().toISOString(),
    productCount: 0,
  };
  themes.push(theme);
  saveThemes(themes);
  return theme;
}

export function deleteTheme(slug: string): boolean {
  const themes = getThemes();
  const filtered = themes.filter((t) => t.slug !== slug);
  if (filtered.length === themes.length) return false;
  saveThemes(filtered);
  const csvPath = path.join(THEMES_CSV_DIR, `${slug}.csv`);
  if (fs.existsSync(csvPath)) fs.unlinkSync(csvPath);
  return true;
}

export function getTheme(slug: string): Theme | undefined {
  return getThemes().find((t) => t.slug === slug);
}

export function saveThemeCSV(slug: string, csvContent: string): number {
  ensureDirs();
  const csvPath = path.join(THEMES_CSV_DIR, `${slug}.csv`);
  fs.writeFileSync(csvPath, csvContent);

  const rowCount = countCSVRows(csvContent);

  const themes = getThemes();
  const theme = themes.find((t) => t.slug === slug);
  if (theme) {
    theme.productCount = rowCount;
    saveThemes(themes);
  }
  return rowCount;
}

function countCSVRows(csv: string): number {
  let count = 0;
  let inQuotes = false;
  let hasContent = false;

  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    if (char === '"') {
      if (inQuotes && csv[i + 1] === '"') {
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      hasContent = true;
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && csv[i + 1] === "\n") i++;
      if (hasContent) count++;
      hasContent = false;
    } else {
      hasContent = true;
    }
  }
  if (hasContent) count++;
  return Math.max(0, count - 1); // subtract header row
}

export function getThemeCSVPath(slug: string): string | null {
  const csvPath = path.join(THEMES_CSV_DIR, `${slug}.csv`);
  return fs.existsSync(csvPath) ? csvPath : null;
}

export function getThemeCSV(slug: string): string | null {
  const csvPath = getThemeCSVPath(slug);
  if (!csvPath) return null;
  return fs.readFileSync(csvPath, "utf-8");
}

export function getThemeProducts(slug: string): Product[] {
  const csv = getThemeCSV(slug);
  if (!csv) return [];

  return parseCSVToProducts(csv);
}
