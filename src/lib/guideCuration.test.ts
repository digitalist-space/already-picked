import assert from "node:assert/strict";
import test from "node:test";
import {
 BAYESIAN_PRICE_TIE_THRESHOLD,
 confidence,
 curateGuide,
 curateGuideWithReport,
 editorialBestFor,
 functionalTokens,
} from "./guideCuration.ts";
import type { Product } from "./types.ts";
function p(id: string, title: string, reviewCount=1000, price=10, brand?: string): Product {
 return {id,title,reviewCount,price,brand,rating:4.6,category:"Reading Lights",specs:{},imageUrl:"",description:"",affiliateUrl:"",tags:[],featured:false,dateAdded:""};
}
test("cross brand clones collapse; distinct neck and red lights survive",()=>{
 const products=[p("a","Gritin 19 LED clip-on book light",21000),p("b","Glocusent USB rechargeable book light",21),p("c","86lux clip-on book light",500),p("d","86lux rechargeable book light",600),p("e","Gritin wearable neck reading light"),p("f","630nm red reading light")];
 assert.deepEqual(new Set(curateGuide(products).map(x=>x.id)),new Set(["a","e","f"]));
});
test("exact ASIN duplicates and multiple 86lux variants keep one winner", () => {
 const exactA = {...p("exact-a", "86lux 19 LED clip-on book light", 8000), asin: "SAME"};
 const exactB = {...p("exact-b", "86lux alternate listing", 20), asin: "SAME"};
 const variant = {...p("variant", "86lux USB rechargeable clip-on reading light", 500), asin: "OTHER"};
 const report = curateGuideWithReport([exactA, exactB, variant]);
 assert.deepEqual(report.selected.map((item) => item.id), ["exact-a"]);
 assert.equal(report.removed.find((item) => item.product.id === "exact-b")?.reason, "exact-asin");
 assert.equal(report.removed.find((item) => item.product.id === "variant")?.reason, "white-label-clone");
});
test("wooden holders and embroidered bookmarks each get one winner",()=>{
 const products=[p("a","Wooden thumb page holder",1000,8),p("b","Wooden page holder",1000,6),p("c","Hand embroidered corner bookmark"),p("d","Embroidered corner bookmark floral")];
 assert.deepEqual(new Set(curateGuide(products).map(x=>x.id)),new Set(["b","c"]));
});
test("missing price is excluded and guide is capped",()=>{
 const products=Array.from({length:30},(_,i)=>p(String(i),"Item "+i));
 assert.equal(curateGuide([...products,p("missing","Missing price",1000,0)]).length,25);
 assert.equal(curateGuide([p("missing","Missing price",1000,0),p("no-reviews","No reviews",0)]).length,0);
});

test("category aliases and exact ASIN duplicates collapse",()=>{
 const a={...p("a","Portable folding reading lamp"),subcategory:"BOOK LIGHTS",asin:"ABC"};
 const b={...p("b","Portable folding reading lamp",2000),subcategory:"READING LIGHTS"};
 const c={...p("c","Different title",10),asin:"ABC"};
 assert.deepEqual(curateGuide([a,b,c]).map(x=>x.id),["a"]);
});

test("broad guide categories do not turn distinct products into clones", () => {
 const products = [
  {...p("a", "Magnetic fidget balls"), category: "NeeDoh Sensory Toys"},
  {...p("b", "Quiet textured worry stones"), category: "NeeDoh Sensory Toys"},
  {...p("c", "Sensory feelings bottle"), category: "NeeDoh Sensory Toys"},
 ];
 assert.equal(curateGuide(products).length, 3);
});

test("one brand can survive with genuinely distinct products", () => {
 const products = [
  {...p("a", "LEGO Friends Axolotl Adventure Boat"), category: "Small LEGO"},
  {...p("b", "LEGO City Spacecraft and Astronaut"), category: "Small LEGO"},
  {...p("c", "LEGO Minifigure Keychain"), category: "Small LEGO"},
 ];
 assert.equal(curateGuide(products).length, 3);
});

test("reports preserve winner evidence and removal reasons", () => {
 const winner = {...p("winner", "Gritin 19 LED clip-on book light", 21000), asin: "WIN"};
 const duplicate = {...p("duplicate", "86lux rechargeable clip-on book light", 30), asin: "LOSE"};
 const report = curateGuideWithReport([winner, duplicate]);
 assert.equal(report.selected[0].id, "winner");
 assert.equal(report.removed[0].winner?.id, "winner");
 assert.equal(report.removed[0].reason, "white-label-clone");
 assert.equal(report.selected[0].bestFor, "Best clip-on book light");
});

test("Bayesian confidence uses m=500 and C=4.5", () => {
 const item = {...p("score", "Scored item", 500), rating: 4};
 assert.equal(confidence(item), 4.25);
 assert.equal(BAYESIAN_PRICE_TIE_THRESHOLD, 0.015);
});

test("price wins only inside the Bayesian tie threshold", () => {
 const expensive = {...p("expensive", "Same functional product alpha", 500, 20), rating: 4.5};
 const cheap = {...p("cheap", "Same functional product beta", 500, 10), rating: 4.49};
 assert.equal(curateGuide([expensive, cheap])[0].id, "cheap");
 const materiallyBetter = {...expensive, id: "better", rating: 4.8};
 assert.equal(curateGuide([materiallyBetter, cheap])[0].id, "better");
});

test("functional tokens strip brands, counts, and marketing words", () => {
 const item = p("tokens", "86lux Upgraded 19 LED Portable Book Light Gift Set", 1000, 10, "86lux");
 assert.deepEqual([...functionalTokens(item)].sort(),
  ["book", "light", "reading"].sort());
});

test("collectible categories can disable cross-brand clustering", () => {
 const products = [
  {...p("a", "Alpha 300-piece mini building blocks flower"), category: "Creative Gifts"},
  {...p("b", "Beta 500-piece mini building blocks flower"), category: "Creative Gifts"},
 ];
 assert.equal(curateGuide(products).length, 1);
 assert.equal(curateGuide(products, {crossBrandClustering: false}).length, 2);
});

test("tight bookmark variants collapse by material and mechanism", () => {
 const leather = [
  p("leather-a", "Personalized Leather Heart Corner Bookmark with Initial"),
  p("leather-b", "Custom Faux Leather Heart Bookmark Page Corner"),
 ];
 const wooden = [
  p("wood-a", "Personalized Wooden Thumb Page Holder for One-Handed Reading"),
  p("wood-b", "Custom Wood Book Page Holder Thumb Ring One Hand"),
 ];
 const chain = [
  p("chain-a", "Metal Feather Bookmark with Hanging Chain Charm"),
  p("chain-b", "Stainless Steel Leaf Bookmark Chain Pendant Charm"),
 ];
 assert.equal(curateGuide(leather).length, 1);
 assert.equal(curateGuide(wooden).length, 1);
 assert.equal(curateGuide(chain).length, 1);
});

test("short hooks and Amazon image variants strengthen identity globally", () => {
 const hookTwins = [
  {...p("hook-a", "Maker One Reader Accessory"), category: "Future Category",
    shortHook: "Leather heart corner bookmark for page marking"},
  {...p("hook-b", "Maker Two Book Accessory"), category: "Future Category",
    shortHook: "Leather heart corner bookmark for page marking"},
 ];
 const imageTwins = [
  {...p("image-a", "First listing"), category: "Another Future Category",
    imageUrl: "https://m.media-amazon.com/images/I/ABC123._AC_UL320_.jpg"},
  {...p("image-b", "Second listing"), category: "Another Future Category",
    imageUrl: "https://images-na.ssl-images-amazon.com/images/I/ABC123._SL1500_.jpg"},
 ];
 assert.equal(curateGuide(hookTwins).length, 1);
 assert.equal(curateGuide(imageTwins).length, 1);
});

test("the same global algorithm applies to arbitrary future categories", () => {
 for (const category of ["Future Reading Gear", "Future Desk Gear", "Future Travel Gear"]) {
  const products = [
   {...p(`${category}-a`, "Alpha leather heart corner bookmark"), category},
   {...p(`${category}-b`, "Beta leather heart page corner bookmark"), category},
   {...p(`${category}-distinct`, "Wearable neck reading light"), category},
  ];
  assert.equal(curateGuide(products).length, 2);
 }
});

test("ultra-low-review variants cannot outrank established equivalents", () => {
 const established = {...p("established", "Alpha metal chain charm bookmark", 500, 12), rating: 4.4};
 const lowEvidence = {...p("low", "Beta metal chain charm bookmark", 8, 8), rating: 5};
 assert.equal(curateGuide([lowEvidence, established])[0].id, "established");
});

test("editorial labels use concise natural copy instead of token concatenation", () => {
 assert.equal(
  editorialBestFor(p("stickers", "50 PCS Bookish Stickers for Kindle and Reading Journals")),
  "Best Kindle & journal stickers"
 );
 assert.equal(
  editorialBestFor(p("pens", "10 Book Pens with Bookish Quotes for Readers")),
  "Best bookish quote pens"
 );
 assert.equal(
  editorialBestFor(p("holder", "Personalized Wooden Thumb Page Holder")),
  "Best wooden page holder"
 );
});

test("every selected label is unique and card-line length", () => {
 const products = [
  p("a", "Metal Feather Bookmark"),
  p("b", "Metal Leaf Bookmark"),
  p("c", "Magnetic Cat Bookmark"),
  p("d", "Book Lover Acrylic Desk Sign"),
 ];
 const labels = curateGuide(products).map((item) => item.bestFor || "");
 assert.equal(new Set(labels).size, labels.length);
 assert.ok(labels.every((label) => label.length > 0 && label.length <= 44));
});
