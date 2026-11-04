export type Stock = {quantity:number|null;costPerShare:number|null;acquiredAt:string|null;notes:string;id:string;symbol:string;companyName:string;currency:string;exchange:string;addedAt:string;addedPrice:number;initialQuoteTime:string;currentPrice:number;previousClose?:number|null;dayChangePercent?:number|null;quoteTime:string;checkedAt:string;quoteError:string|null};
export type Watchlist = {mode:'basic'|'advanced';id:string;name:string;createdAt:string;stocks:Stock[];role:'owner'|'viewer';shareToken?:string|null};
export type AccountState = {guest?:boolean;savePromptShown?:boolean;version:number;updatedAt:string;user:{analytics?:boolean;local:boolean;id:string;name:string;email:string;country:string|null;hasBilling:boolean};plan:{id:'free'|'pro';maxLists:number|null;maxStocks:number;pageSize:number;trialEndsAt:string|null;expired:boolean};watchlists:Watchlist[]};
export {watchlistPerformance} from './watchlist-performance.mjs';
export function watchlistDayChange(list:Pick<Watchlist,'stocks'>){
 const changes=list.stocks.map(stock=>stock.dayChangePercent).filter((value):value is number=>typeof value==='number'&&Number.isFinite(value));
 if(!changes.length)return null;
 return changes.reduce((total,value)=>total+value,0)/changes.length;
}
export function watchlistRefreshTime(list:Pick<Watchlist,'stocks'>,now=Date.now()){
 const times=list.stocks.map(stock=>Date.parse(stock.checkedAt)).filter(Number.isFinite);
 if(!times.length)return 'Not refreshed yet';
 const minutes=Math.max(0,Math.floor((now-Math.min(...times))/60_000));
 if(minutes<1)return 'Refreshed just now';
 if(minutes<60)return `Refreshed ${minutes} min ago`;
 const hours=Math.floor(minutes/60);
 if(hours<24)return `Refreshed ${hours} hr${hours===1?'':'s'} ago`;
 const days=Math.floor(hours/24);
 return `Refreshed ${days} day${days===1?'':'s'} ago`;
}
export {quoteUnit} from './instrument.mjs';
export const quoteTime=(value:string)=>new Date(value).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
export {formatMoney as price,priceDigits} from './price-format.mjs';
