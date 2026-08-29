const SPREADSHEET_ID = "1vicbagFM6DZO7Kyh9EvHPAj9j3H86Rh9L1th-TpuEQM";

function doGet() {
  return jsonResponse({
    ok: true,
    service: "AlreadyPicked Google Sheets Receiver",
  });
}

function doPost(event) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const payload = JSON.parse((event && event.postData && event.postData.contents) || "{}");
    const expectedToken = PropertiesService.getScriptProperties().getProperty("EXPORT_TOKEN");
    if (!expectedToken || payload.token !== expectedToken) {
      return jsonResponse({ ok: false, error: "Unauthorized export." });
    }

    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const productsSheet = requiredSheet(spreadsheet, "Products");
    const landingPagesSheet = requiredSheet(spreadsheet, "Landing Pages");
    const pageProductsSheet = requiredSheet(spreadsheet, "Page Products");

    if (payload.action) {
      const result = handleAdminAction(
        payload,
        productsSheet,
        landingPagesSheet,
        pageProductsSheet
      );
      SpreadsheetApp.flush();
      return jsonResponse(result);
    }

    if (payload.dryRun === true) {
      return jsonResponse({
        ok: true,
        dryRun: true,
        spreadsheet: spreadsheet.getName(),
      });
    }

    const productHeaders = headersFor(productsSheet);
    const landingHeaders = headersFor(landingPagesSheet);
    const pageProductHeaders = headersFor(pageProductsSheet);
    const existingProducts = valuesBelowHeader(productsSheet);
    const existingAsins = new Set(
      existingProducts
        .map((row) => String(row[productHeaders.indexOf("asin")] || "").toUpperCase())
        .filter(Boolean)
    );
    let nextProductId = existingProducts.reduce((max, row) => {
      const value = Number(row[productHeaders.indexOf("id")]);
      return Number.isFinite(value) ? Math.max(max, value) : max;
    }, 0) + 1;

    const incomingProducts = Array.isArray(payload.products) ? payload.products : [];
    const productRows = [];
    let skipped = 0;
    incomingProducts.forEach((product) => {
      const asin = String(product.asin || "").toUpperCase();
      if (!asin || existingAsins.has(asin)) {
        skipped += 1;
        return;
      }
      const record = {
        id: nextProductId++,
        title: product.title || "",
        description: product.description || "",
        price: product.price == null ? "" : Number(product.price),
        original_price: product.originalPrice == null ? "" : Number(product.originalPrice),
        rating: product.rating === "" ? "" : Number(product.rating),
        review_count:
          product.reviews === ""
            ? ""
            : Number(String(product.reviews).replace(/[^\d]/g, "")),
        category: product.category || "",
        subcategory: product.subcategory || "",
        asin,
        image_url: product.image || "",
        tags: product.tags || "",
        featured: product.featured ? "✔" : "✗",
        date_added: product.dateAdded || isoDate(),
        status: "active",
      };
      Object.keys(product.specs || {}).forEach((key) => {
        record[`spec_${key}`] = product.specs[key] || "";
      });
      productRows.push(productHeaders.map((header) => record[header] ?? ""));
      existingAsins.add(asin);
    });
    appendRows(productsSheet, productRows);

    const slug = String(payload.slug || "").toLowerCase();
    const theme = String(payload.theme || "").trim();
    upsertLandingPage(landingPagesSheet, landingHeaders, slug, theme, incomingProducts);

    const pageProductRows = valuesBelowHeader(pageProductsSheet);
    const existingLinks = new Set(
      pageProductRows.map((row) => {
        const rowSlug = String(
          row[pageProductHeaders.indexOf("theme_slug")] || ""
        ).toLowerCase();
        const asin = String(
          row[pageProductHeaders.indexOf("asin")] || ""
        ).toUpperCase();
        return `${rowSlug}|${asin}`;
      })
    );
    const currentThemeOrders = pageProductRows
      .filter(
        (row) =>
          String(
            row[pageProductHeaders.indexOf("theme_slug")] || ""
          ).toLowerCase() === slug
      )
      .map(
        (row) =>
          Number(row[pageProductHeaders.indexOf("display_order")]) || 0
      );
    let nextOrder = Math.max(0, ...currentThemeOrders) + 1;
    const linkRows = [];
    incomingProducts.forEach((product) => {
      const asin = String(product.asin || "").toUpperCase();
      const key = `${slug}|${asin}`;
      if (!asin || existingLinks.has(key)) return;
      const record = {
        theme_slug: slug,
        asin,
        display_order: nextOrder++,
        featured: product.featured ? "✔" : "✗",
        editorial_note: "",
        date_added: product.dateAdded || isoDate(),
      };
      linkRows.push(pageProductHeaders.map((header) => record[header] ?? ""));
      existingLinks.add(key);
    });
    appendRows(pageProductsSheet, linkRows);

    SpreadsheetApp.flush();
    return jsonResponse({
      ok: true,
      added: productRows.length,
      skipped,
      linked: linkRows.length,
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: String(error && error.message ? error.message : error),
    });
  } finally {
    lock.releaseLock();
  }
}

function handleAdminAction(
  payload,
  productsSheet,
  landingPagesSheet,
  pageProductsSheet
) {
  const action = String(payload.action || "");

  if (action === "setProductStatus") {
    const allowed = ["active", "hidden", "archived"];
    const status = String(payload.status || "").toLowerCase();
    const asin = String(payload.asin || "").toUpperCase();
    if (!asin || !allowed.includes(status)) {
      throw new Error("Invalid product status request.");
    }

    const headers = headersFor(productsSheet);
    const asinColumn = requiredHeader(headers, "asin");
    const statusColumn = requiredHeader(headers, "status");
    const rowNumber = findRow(
      productsSheet,
      asinColumn,
      asin,
      true
    );
    if (!rowNumber) throw new Error("Product not found.");
    productsSheet.getRange(rowNumber, statusColumn + 1).setValue(status);
    return { ok: true, action, asin, status };
  }

  if (action === "removeProductFromGuide") {
    const asin = String(payload.asin || "").toUpperCase();
    const slug = String(payload.slug || "").toLowerCase();
    if (!asin || !slug) throw new Error("ASIN and guide slug are required.");

    const headers = headersFor(pageProductsSheet);
    const slugColumn = requiredHeader(headers, "theme_slug");
    const asinColumn = requiredHeader(headers, "asin");
    const rows = valuesBelowHeader(pageProductsSheet);
    let removed = 0;
    for (let index = rows.length - 1; index >= 0; index -= 1) {
      const rowSlug = String(rows[index][slugColumn] || "").toLowerCase();
      const rowAsin = String(rows[index][asinColumn] || "").toUpperCase();
      if (rowSlug === slug && rowAsin === asin) {
        pageProductsSheet.deleteRow(index + 2);
        removed += 1;
      }
    }
    if (!removed) throw new Error("Product is not linked to this guide.");
    return { ok: true, action, asin, slug, removed };
  }

  if (action === "setGuideStatus") {
    const allowed = ["draft", "published", "archived"];
    const status = String(payload.status || "").toLowerCase();
    const slug = String(payload.slug || "").toLowerCase();
    if (!slug || !allowed.includes(status)) {
      throw new Error("Invalid guide status request.");
    }

    const headers = headersFor(landingPagesSheet);
    const slugColumn = requiredHeader(headers, "theme_slug");
    const statusColumn = requiredHeader(headers, "status");
    const updatedColumn = headers.indexOf("updated_date");
    const rowNumber = findRow(
      landingPagesSheet,
      slugColumn,
      slug,
      true
    );
    if (!rowNumber) throw new Error("Guide not found.");
    landingPagesSheet.getRange(rowNumber, statusColumn + 1).setValue(status);
    if (updatedColumn >= 0) {
      landingPagesSheet.getRange(rowNumber, updatedColumn + 1).setValue(isoDate());
    }
    return { ok: true, action, slug, status };
  }

  throw new Error("Unsupported admin action.");
}

function requiredHeader(headers, name) {
  const index = headers.indexOf(name);
  if (index < 0) throw new Error(`Missing required column: ${name}`);
  return index;
}

function findRow(sheet, columnIndex, value, ignoreCase) {
  const rows = valuesBelowHeader(sheet);
  const expected = ignoreCase ? String(value).toLowerCase() : String(value);
  const index = rows.findIndex((row) => {
    const candidate = String(row[columnIndex] || "");
    return (ignoreCase ? candidate.toLowerCase() : candidate) === expected;
  });
  return index < 0 ? 0 : index + 2;
}

function upsertLandingPage(sheet, headers, slug, theme, products) {
  const rows = valuesBelowHeader(sheet);
  const slugIndex = headers.indexOf("theme_slug");
  const existingIndex = rows.findIndex(
    (row) => String(row[slugIndex] || "").toLowerCase() === slug
  );
  const now = isoDate();
  const category = products.find((product) => product.category)?.category || "";
  const title = titleCase(theme);
  const record = {
    theme_slug: slug,
    page_title: title,
    seo_title: `${title} | AlreadyPicked`,
    meta_description: `Explore hand-picked ${theme}, with product details and comparisons.`,
    page_heading: title,
    intro_copy: `Browse our curated selection of ${theme}.`,
    about_copy: buildAboutCopy(title, category, products),
    primary_category: category,
    status: "draft",
    affiliate_tag: "",
    hero_image_url: "",
    created_date: now,
    updated_date: now,
  };
  if (existingIndex >= 0) {
    const row = rows[existingIndex];
    record.created_date = row[headers.indexOf("created_date")] || now;
    const merged = headers.map((header, index) => {
      if (["updated_date", "primary_category"].includes(header)) {
        return record[header] || row[index] || "";
      }
      return row[index] || record[header] || "";
    });
    sheet.getRange(existingIndex + 2, 1, 1, headers.length).setValues([merged]);
  } else {
    appendRows(sheet, [headers.map((header) => record[header] ?? "")]);
  }
}

function requiredSheet(spreadsheet, name) {
  const sheet = spreadsheet.getSheetByName(name);
  if (!sheet) throw new Error(`Missing required tab: ${name}`);
  return sheet;
}

function buildAboutCopy(title, category, products) {
  const count = products.length;
  const prices = products
    .map((product) => Number(product.price))
    .filter((price) => Number.isFinite(price) && price > 0);
  const ratings = products
    .map((product) => Number(product.rating))
    .filter((rating) => Number.isFinite(rating) && rating > 0);
  const priceCopy = prices.length
    ? ` Prices currently range from $${Math.min(...prices).toFixed(2)} to $${Math.max(...prices).toFixed(2)}.`
    : "";
  const ratingCopy = ratings.length
    ? ` The average customer rating is ${(ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1)} out of 5.`
    : "";
  return `Explore our guide to ${String(title).toLowerCase()}, featuring ${count} carefully selected ${String(category || "recommended").toLowerCase()} products.${priceCopy}${ratingCopy} Compare product uses, prices, ratings, and key details to find the option that best fits your needs and budget.`;
}

function headersFor(sheet) {
  return sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getDisplayValues()[0]
    .map((value) => String(value).trim())
    .filter(Boolean);
}

function valuesBelowHeader(sheet) {
  const rows = sheet.getLastRow() - 1;
  if (rows <= 0) return [];
  return sheet.getRange(2, 1, rows, sheet.getLastColumn()).getValues();
}

function appendRows(sheet, rows) {
  if (!rows.length) return;
  const startRow = sheet.getLastRow() + 1;
  if (sheet.getLastRow() >= 2) {
    const templateRange = sheet.getRange(2, 1, 1, rows[0].length);
    templateRange.copyFormatToRange(
      sheet,
      1,
      rows[0].length,
      startRow,
      startRow + rows.length - 1
    );
    const templateValidations = templateRange.getDataValidations()[0];
    if (templateValidations.some(Boolean)) {
      const validations = Array.from(
        { length: rows.length },
        () => templateValidations.slice()
      );
      sheet
        .getRange(startRow, 1, rows.length, rows[0].length)
        .setDataValidations(validations);
    }
  }
  sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
}

function isoDate() {
  return Utilities.formatDate(new Date(), "America/New_York", "yyyy-MM-dd");
}

function titleCase(value) {
  return String(value || "").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function jsonResponse(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(
    ContentService.MimeType.JSON
  );
}

// ---------------------------------------------------------------------------
// Push cache invalidation to the website.
//
// The site caches the Sheet for an hour so guide pages can be prerendered.
// Changes made through the admin screen invalidate that cache on their own,
// but rows typed directly into this workbook are invisible to the site until
// the hour is up. These helpers close that gap.
//
// One-time setup:
//   1. Open this project from https://script.google.com/home/my — it is the
//      one deployed as the Web App the site posts to, so do NOT paste this
//      into a new project or the deployment URL will change.
//   2. Run setupRevalidateTrigger() once and approve the permission prompt.
//   3. To force a refresh by hand, run revalidateNow(). If this project is
//      bound to the spreadsheet, reloading the sheet also gives you an
//      "AlreadyPicked" menu with a "Publish changes now" item.
// ---------------------------------------------------------------------------

const SITE_REVALIDATE_URL = "https://www.alreadypicked.com/api/revalidate";
const WATCHED_SHEETS = ["Products", "Landing Pages", "Page Products"];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("AlreadyPicked")
    .addItem("Publish changes now", "revalidateNow")
    .addToUi();
}

/** Installable edit trigger — created by setupRevalidateTrigger(). */
function onSheetEdit(event) {
  const sheet = event && event.range && event.range.getSheet();
  if (!sheet || WATCHED_SHEETS.indexOf(sheet.getName()) === -1) return;

  // Filling in a row fires this once per cell. Throttle to one call every few
  // seconds so a burst of edits does not become a burst of HTTP requests.
  const cache = CacheService.getScriptCache();
  if (cache.get("revalidate_sent")) return;
  cache.put("revalidate_sent", "1", 5);

  notifySite_(slugForEdit_(sheet, event.range));
}

/**
 * Force a refresh, no throttle. Run it from the "AlreadyPicked" menu if this
 * script is bound to the spreadsheet, or straight from the Apps Script editor
 * (pick revalidateNow in the function dropdown and press Run) if it is a
 * standalone project — in which case there is no active spreadsheet to toast.
 */
function revalidateNow() {
  const result = notifySite_("");
  const message = result
    ? "Website refreshed."
    : "Refresh failed — check the execution log.";

  console.log(message);
  try {
    const active = SpreadsheetApp.getActive();
    if (active) active.toast(message, "AlreadyPicked", 5);
  } catch (error) {
    // Standalone script: no bound spreadsheet, the log above is the feedback.
  }
  return result;
}

function slugForEdit_(sheet, range) {
  if (sheet.getName() !== "Landing Pages") return "";
  try {
    if (range.getRow() < 2) return "";
    // Read the header row directly rather than via headersFor(), which drops
    // blank cells and would shift the column index.
    const headers = sheet
      .getRange(1, 1, 1, sheet.getLastColumn())
      .getDisplayValues()[0]
      .map((value) => String(value).trim().toLowerCase());
    const column = headers.indexOf("theme_slug");
    if (column === -1) return "";
    return String(
      sheet.getRange(range.getRow(), column + 1).getValue() || ""
    ).trim();
  } catch (error) {
    return "";
  }
}

function notifySite_(slug) {
  const token =
    PropertiesService.getScriptProperties().getProperty("EXPORT_TOKEN");
  if (!token) {
    console.error("EXPORT_TOKEN is not set; cannot refresh the website.");
    return false;
  }

  try {
    const response = UrlFetchApp.fetch(SITE_REVALIDATE_URL, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({ token: token, slug: slug || undefined }),
      muteHttpExceptions: true,
    });
    const code = response.getResponseCode();
    if (code !== 200) {
      console.error("Revalidate failed: " + code + " " + response.getContentText());
      return false;
    }
    return true;
  } catch (error) {
    console.error("Revalidate request threw: " + error);
    return false;
  }
}

/** Run once from the Apps Script editor to install the edit trigger. */
function setupRevalidateTrigger() {
  const existing = ScriptApp.getProjectTriggers();
  for (let i = 0; i < existing.length; i++) {
    if (existing[i].getHandlerFunction() === "onSheetEdit") {
      ScriptApp.deleteTrigger(existing[i]);
    }
  }

  ScriptApp.newTrigger("onSheetEdit")
    .forSpreadsheet(SpreadsheetApp.openById(SPREADSHEET_ID))
    .onEdit()
    .create();

  console.log("Edit trigger installed. Sheet changes now refresh the website.");
}
