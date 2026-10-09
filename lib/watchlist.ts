export type Stock = {quantity:number|null;costPerShare:number|null;acquiredAt:string|null;notes:string;id:string;symbol:string;companyName:string;currency:string;exchange:string;addedAt:string;addedPrice:number;initialQuoteTime:string;currentPrice:number;previousClose?:number|null;dayChangePercent?:number|null;quoteTime:string;checkedAt:string;quoteError:string|null};
export type Watchlist = {mode:'basic'|'advanced';id:string;name:string;createdAt:string;stocks:Stock[];role:'owner'|'viewer';shareToken?:string|null};
export type AccountState = {guest?:boolean;savePromptShown?:boolean;version:number;updatedAt:string;user:{analytics?:boolean;local:boolean;id:string;name:string;email:string;country:string|null;hasBilling:boolean};plan:{id:'free'|'pro';maxLists:number|null;maxStocks:number;pageSize:number;trialEndsAt:string|null;expired:boolean};watchlists:Watchlist[]};
export {watchlistPerformance} from './watchlist-performance.mjs';
export {quoteUnit} from './instrument.mjs';
export const quoteTime=(value:string)=>new Date(value).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
export {formatMoney as price,priceDigits} from './price-format.mjs';
