import assert from "node:assert/strict";
import test from "node:test";
import { curateGuide } from "./guideCuration.ts";
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
 assert.equal(curateGuide([p("missing","Missing price",1000,0)]).length,0);
});
