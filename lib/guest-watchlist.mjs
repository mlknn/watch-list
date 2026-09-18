export const GUEST_MAX_LISTS=1;
export const GUEST_KEY='watchlist:guest-v1';
import {assertQuoteCurrency} from './portfolio-currency.mjs';
import {OPEN_PLAN} from './plan.mjs';

/** @typedef {import('./watchlist').AccountState} GuestState */

/** @returns {GuestState} */
export function emptyGuestState(){
  return {
    guest:true,
    version:2,
    updatedAt:new Date().toISOString(),
    savePromptShown:false,
    user:{id:'guest',name:'Guest',email:'',local:true,country:null,hasBilling:false},
    plan:{...OPEN_PLAN,maxLists:GUEST_MAX_LISTS},
    watchlists:[]
  };
}

function persistable(state){
  return {version:1,updatedAt:state.updatedAt,savePromptShown:!!state.savePromptShown,watchlists:state.watchlists};
}

/** @param {Pick<Storage,'getItem'>|null} [storage] @returns {GuestState} */
export function readGuestState(storage){
  if(!storage)return emptyGuestState();
  try{
    const raw=storage.getItem(GUEST_KEY);
    if(!raw)return emptyGuestState();
    const parsed=JSON.parse(raw);
    if(!parsed||!Array.isArray(parsed.watchlists))return emptyGuestState();
    return {...emptyGuestState(),updatedAt:parsed.updatedAt||new Date().toISOString(),savePromptShown:!!parsed.savePromptShown,watchlists:parsed.watchlists.map(list=>({...list,role:'owner'}))};
  }catch{
    return emptyGuestState();
  }
}

/** @param {GuestState} state @param {Pick<Storage,'setItem'>|null} [storage] @returns {GuestState} */
export function writeGuestState(state,storage){
  if(!storage)return state;
  const next={...state,guest:true,updatedAt:new Date().toISOString()};
  storage.setItem(GUEST_KEY,JSON.stringify(persistable(next)));
  return next;
}

/** @param {Pick<Storage,'removeItem'>|null} [storage] */
export function clearGuestState(storage){
  try{storage?.removeItem(GUEST_KEY);}catch{/* Keep trying to use the in-memory guest list. */}
}

/** @param {GuestState|null} [state] @param {Pick<Storage,'getItem'>|null} [storage] */
export function guestHasDraft(state,storage){
  const data=state||readGuestState(storage);
  return data.watchlists.some(list=>list.stocks?.length);
}

/** @param {Pick<Storage,'getItem'|'setItem'>|null} [storage] @returns {GuestState} */
export function ensureGuestList(storage){
  const state=readGuestState(storage);
  if(state.watchlists.length)return state;
  return writeGuestState(applyGuestAction(state,{action:'createList'}),storage);
}

/** @param {GuestState} state @returns {GuestState} */
export function applyGuestAction(state,input,quote){
  if(!input||typeof input!=='object')throw new Error('Invalid request.');
  const next={...state,watchlists:state.watchlists.map(list=>({...list,stocks:[...list.stocks]}))};
  const touch=()=>{next.updatedAt=new Date().toISOString();return next;};
  if(input.action==='refresh'){
    if(!quote)return touch();
    next.watchlists=next.watchlists.map(list=>({...list,stocks:list.stocks.map(stock=>{
      const fresh=quote[stock.symbol];
      if(!fresh||fresh.currency!==stock.currency)return stock;
      return {...stock,currentPrice:fresh.price,quoteTime:fresh.quoteTime,checkedAt:fresh.checkedAt||new Date().toISOString(),quoteError:null,companyName:fresh.companyName||stock.companyName,exchange:fresh.exchange||stock.exchange};
    })}));
    return touch();
  }
  if(input.action==='createList'){
    const name=String(input.name||'').trim()||'My watchlist';
    if(name.length>60)throw new Error('Keep the name under 60 characters.');
    if(next.watchlists.length>=GUEST_MAX_LISTS)throw new Error('Create a free account to add more watchlists. Your current list stays on this device.');
    next.watchlists.push({mode:'advanced',id:crypto.randomUUID(),name,createdAt:new Date().toISOString(),stocks:[],role:'owner',shareToken:null});
    return touch();
  }
  const list=next.watchlists.find(item=>item.id===input.listId);
  if(!list)throw new Error('Watchlist not found or you do not own it.');
  if(input.action==='renameList'){
    const name=String(input.name||'').trim();
    if(name.length<1||name.length>60)throw new Error('Enter a name between 1 and 60 characters.');
    list.name=name;
    return touch();
  }
  if(input.action==='deleteList'){
    if(next.watchlists.length<=1)throw new Error('Keep at least one watchlist.');
    next.watchlists=next.watchlists.filter(item=>item.id!==list.id);
    return touch();
  }
  if(input.action==='removeStock'){
    const before=list.stocks.length;
    list.stocks=list.stocks.filter(stock=>stock.id!==input.stockId);
    if(list.stocks.length===before)throw new Error('Stock not found.');
    return touch();
  }
  if(input.action==='addStock'){
    if(!quote)throw new Error('A current quote is unavailable. Please try adding this stock again shortly.');
    if(quote.currency)assertQuoteCurrency(quote.currency,list.stocks);
    if(list.stocks.length>=next.plan.maxStocks)throw new Error('Stock limit reached for this watchlist.');
    const quantity=Number(input.quantity);
    const cost=Number(input.costPerShare??quote.price);
    if(!Number.isFinite(quantity)||quantity<=0||!Number.isFinite(cost)||cost<=0)throw new Error('Enter a positive share quantity and cost per share.');
    const acquired=input.acquiredAt?new Date(input.acquiredAt):new Date();
    if(Number.isNaN(acquired.getTime())||acquired>new Date())throw new Error('Enter a valid purchase date, no later than today.');
    const notes=String(input.notes||'');
    if(notes.length>500)throw new Error('Keep notes under 500 characters.');
    const now=new Date().toISOString();
    list.stocks.push({
      id:crypto.randomUUID(),
      symbol:quote.symbol,
      companyName:quote.companyName||quote.symbol,
      currency:quote.currency,
      exchange:quote.exchange||'',
      addedAt:now,
      addedPrice:quote.price,
      initialQuoteTime:quote.quoteTime||now,
      currentPrice:quote.price,
      quoteTime:quote.quoteTime||now,
      checkedAt:quote.checkedAt||now,
      quoteError:null,
      quantity,
      costPerShare:cost,
      acquiredAt:acquired.toISOString(),
      notes
    });
    return touch();
  }
  if(input.action==='initializePosition'){
    const stock=list.stocks.find(item=>item.id===input.stockId);
    if(!stock||stock.quantity!=null)throw new Error('Quantity has already been set, or this position is unavailable.');
    stock.quantity=Number(input.quantity);
    stock.costPerShare=Number(input.costPerShare);
    stock.acquiredAt=input.acquiredAt;
    stock.notes=String(input.notes||'');
    return touch();
  }
  if(input.action==='shareList'||input.action==='revokeShare')throw new Error('Save your list to share it with friends.');
  throw new Error('Unknown action.');
}

/** @param {GuestState} state @param {Pick<Storage,'setItem'>|null} [storage] @returns {GuestState} */
export function markSavePromptShown(state,storage){
  return writeGuestState({...state,savePromptShown:true},storage);
}

/** @param {GuestState|null} [state] */
export function guestImportPayload(state){
  return (state?.watchlists||[]).map(list=>({
    name:list.name,
    stocks:list.stocks.map(stock=>({
      symbol:stock.symbol,
      quantity:stock.quantity,
      costPerShare:stock.costPerShare,
      acquiredAt:stock.acquiredAt,
      notes:stock.notes||''
    }))
  }));
}
