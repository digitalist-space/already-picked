<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Product Curation & Deduplication Standards ("AlreadyPicked" Rules)

Every buying guide, category page, and product ingestion pipeline must enforce strict deduplication and editorial curation before rendering or saving products. Never publish raw, overlapping search results.

1. **Cross-Brand & White-Label Clustering (Form-Factor Deduplication):**
   - Cluster products that share the same functional archetype, form factor, and primary specs—even across different brand names or white-label sellers (e.g., flat-head clip-on rechargeable book lights, wooden thumb page holders, or standard sensory stress balls).
   - Normalize sub-category tags (e.g., merge `BOOK LIGHTS` and `READING LIGHTS`) before deduplicating so identical SKUs aren't listed twice under different labels.

2. **Intra-Brand Cap (Max 1 Variant per Brand per Archetype):**
   - Retain at most **1 product per brand per form-factor cluster**.
   - A brand may appear a second time in the same guide only if the second item serves a genuinely distinct form factor or use case (e.g., a wearable neck light vs. a clip-on book light).

3. **Winner Selection Hierarchy:**
   - Within each cluster of similar products, retain only the top **1–2 winners** ranked by:
     1. **Social Proof Confidence:** Prioritize high rating + high review volume using a Bayesian weighted score (`m = 500`, `C = 4.5`) so low-review alternate ASINs never duplicate or outrank established listings.
     2. **Price-to-Value:** For identical white-label clones or alternate ASINs with comparable review confidence (within `0.015` Bayesian points), keep the lower-priced listing.
     3. **Editorial Differentiation ("Best For" Angle):** Every surviving product in a guide must justify its spot with a distinct use-case or badge (e.g., *Best Overall*, *Best Budget*, *Best Red-Light*, *Best Neck Light*). If two items cannot be meaningfully differentiated for a shopper, drop the lower-scoring one.

4. **Shortlist Cap:**
   - Target a focused, high-conviction shortlist (typically **12–25 distinct products per guide** depending on category breadth) rather than 50–70+ overlapping items.

---
