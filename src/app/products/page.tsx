import type { Metadata } from "next";
import ProductGrid from "@/components/ProductGrid";
import { getCategories, getProducts } from "@/lib/products";

export const metadata: Metadata = {
  title: { absolute: "Browse All Products | AlreadyPicked" },
  description:
    "Search, filter and compare every product included in AlreadyPicked buying guides.",
  alternates: { canonical: "/products" },
};

export default async function ProductsPage() {
  const products = await getProducts();
  const categories = getCategories(products);

  return (
    <div className="catalog-page">
      <div className="catalog-heading">
        <p className="eyebrow">The complete catalog</p>
        <h1>Browse all products</h1>
        <p>
          Search every product from our published buying guides, then filter by
          price, rating or category.
        </p>
      </div>
      <ProductGrid products={products} categories={categories} />
    </div>
  );
}
