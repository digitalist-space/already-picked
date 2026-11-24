import assert from "node:assert/strict";
import test from "node:test";
import { curateGuide, curateGuideWithReport } from "./guideCuration.ts";
import type { Product } from "./types.ts";
function p(id: string, title: string, reviewCount=1000, price=10, brand?: string): Product {
 return {id,title,reviewCount,price,brand,rating:4.6,category:"Reading Lights",specs:{},imageUrl:"",description:"",affiliateUrl:"",tags:[],featured:false,dateAdded:""};
}
test("cross brand clones collapse; distinct neck and red lights survive",()=>{
 const products=[p("a","Gritin 19 LED clip-on book light",21000),p("b","Glocusent USB rechargeable book light",21),p("c","86lux clip-on book light",500),p("d","86lux rechargeable book light",600),p("e","Gritin wearable neck reading light"),p("f","630nm red reading light")];
 assert.deepEqual(new Set(curateGuide(products).map(x=>x.id)),new Set(["a","e","f"]));
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
 assert.deepEqual(curateGuide([a,b,c]).map(x=>x.id),["b"]);
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
 assert.match(report.selected[0].bestFor || "", /clip on rechargeable book light/);
});
