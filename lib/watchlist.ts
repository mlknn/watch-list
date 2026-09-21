export type Stock = {quantity:number|null;costPerShare:number|null;acquiredAt:string|null;notes:string;id:string;symbol:string;companyName:string;currency:string;exchange:string;addedAt:string;addedPrice:number;initialQuoteTime:string;currentPrice:number;quoteTime:string;checkedAt:string;quoteError:string|null};
export type Watchlist = {mode:'basic'|'advanced';id:string;name:string;createdAt:string;stocks:Stock[];role:'owner'|'viewer';shareToken?:string|null};
export type AccountState = {guest?:boolean;savePromptShown?:boolean;version:number;updatedAt:string;user:{analytics?:boolean;local:boolean;id:string;name:string;email:string;country:string|null;hasBilling:boolean};plan:{id:'free'|'pro';maxLists:number;maxStocks:number;pageSize:number;trialEndsAt:string|null;expired:boolean};watchlists:Watchlist[]};
export {watchlistPerformance} from './watchlist-performance.mjs';
export const quoteTime=(value:string)=>new Date(value).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
function priceDigits(value:number){
  const abs=Math.abs(value);
  if(!Number.isFinite(abs)||abs===0)return 2;
  if(abs<0.0001)return 8;
  if(abs<0.01)return 6;
  if(abs<1)return 4;
  return 2;
}
export const price=(value:number,currency:string)=>{
  const digits=priceDigits(value);
  if(!/^[A-Z]{3}$/.test(currency))return `${value.toFixed(digits)} ${currency}`;
  return new Intl.NumberFormat(undefined,{style:'currency',currency,minimumFractionDigits:Math.min(2,digits),maximumFractionDigits:digits}).format(value);
};
