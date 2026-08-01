export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  category: string;
  subcategory?: string;
  asin?: string;
  imageUrl: string;
  affiliateUrl: string;
  tags: string[];
  featured: boolean;
  dateAdded: string;
  specs: Record<string, string>;
  editorialNote?: string;
  status?: "active" | "hidden" | "archived";
}

export interface LandingPage {
  themeSlug: string;
  pageTitle: string;
  seoTitle: string;
  metaDescription: string;
  pageHeading: string;
  introCopy: string;
  aboutCopy: string;
  primaryCategory: string;
  status: "draft" | "published" | "archived";
  affiliateTag: string;
  heroImageUrl: string;
  createdDate: string;
  updatedDate: string;
}

export interface PageProduct {
  themeSlug: string;
  asin: string;
  displayOrder: number;
  featured: boolean;
  editorialNote: string;
  dateAdded: string;
}

export type SortOption =
  | "featured"
  | "price-asc"
  | "price-desc"
  | "rating"
  | "newest";

export interface FilterState {
  search: string;
  category: string;
  subcategory: string;
  minPrice: number | null;
  maxPrice: number | null;
  minRating: number | null;
  sort: SortOption;
}
