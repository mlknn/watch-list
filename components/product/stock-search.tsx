'use client';
import {useT} from "@/components/product/language";
import {useEffect,useId,useRef,useState,type RefObject} from 'react';
import {Search,LoaderCircle} from 'lucide-react';
import {Input} from '@/components/ui/input';
import {getTickerSuggestions,otherMarketIntent,searchTickerSuggestions} from '@/lib/stock-search.mjs';
import {mismatchError} from '@/lib/portfolio-currency.mjs';
import {localizedListError} from '@/lib/list-error';
import {track} from '@/lib/analytics';
type Suggestion={symbol:string;name:string};
export function StockSearch({value,onChange,inputRef,onPick,currency}:{value:string;onChange:(value:string)=>void;inputRef:RefObject<HTMLInputElement|null>;onPick?:(symbol:string)=>void;currency?:string}){const t=useT();
 const [items,setItems]=useState<Suggestion[]>([]),[open,setOpen]=useState(false),[index,setIndex]=useState(-1),[loading,setLoading]=useState(false);const id=useId();const picking=useRef(false);
 const blocked=otherMarketIntent(value,currency);
 useEffect(()=>{const controller=new AbortController();if(blocked){setItems([]);setIndex(-1);setLoading(false);return()=>controller.abort();}setItems(getTickerSuggestions(value,8,currency));setIndex(-1);if(!value.trim()){setLoading(false);return()=>controller.abort();}setLoading(true);const timer=setTimeout(()=>{if(value.trim().length>=2)track('stock_search');void searchTickerSuggestions(value,8,controller.signal,currency).then(result=>{if(!controller.signal.aborted)setItems(result);}).catch(()=>{}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});},180);return()=>{clearTimeout(timer);controller.abort();};},[value,currency,blocked]);
 const visible=open&&!!value.trim();
 function select(item:Suggestion){
  picking.current=true;
  onChange(item.symbol);
  onPick?.(item.symbol);
  setOpen(false);
  setIndex(-1);
  inputRef.current?.blur();
  window.setTimeout(()=>{picking.current=false;},400);
 }
 return <div className="ticker-search-wrap" onBlur={e=>{if(picking.current||e.currentTarget.contains(e.relatedTarget))return;setOpen(false);}}><div className="ticker-field"><Search size={18}/><Input ref={inputRef} role="combobox" aria-label="Stock ticker or company name" aria-autocomplete="list" aria-expanded={visible} aria-controls={id} aria-activedescendant={visible&&index>=0?id+'-'+index:undefined} autoComplete="off" spellCheck={false} maxLength={80} placeholder={currency==='TRY'?t("Search BIST, e.g. THYAO.IS"):currency==='EUR'?t("Search Europe, e.g. ASML.AS"):currency==='CAD'?t("Search Canada, e.g. RY.TO"):currency==='USD'?t("Search US, e.g. Tesla"):t("Search US, Europe, Canada, or Turkey")} value={value} onFocus={()=>setOpen(true)} onChange={e=>{onChange(e.target.value);setOpen(true);}} onKeyDown={e=>{if(e.nativeEvent.isComposing)return;if(e.key==='Escape'){setOpen(false);setIndex(-1);}else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setOpen(true);setIndex(i=>items.length?(e.key==='ArrowDown'?(i+1)%items.length:(i<=0?items.length-1:i-1)):-1);}else if(e.key==='Enter'&&visible&&items.length){e.preventDefault();select(items[index>=0?index:0]);}}}/></div>{visible&&<div className="stock-search-popover"><ul id={id} className="stock-search-options" role="listbox" aria-label="Stock suggestions">{items.map((item,i)=><li id={id+'-'+i} role="option" aria-selected={index===i} key={item.symbol} onPointerDown={e=>{if(e.button!==0)return;e.preventDefault();select(item);}} onPointerMove={()=>setIndex(i)}><span className="suggestion-symbol">{item.symbol}</span><span className="suggestion-name">{item.name}</span></li>)}</ul><div className="stock-search-status" role="status">{blocked?localizedListError(mismatchError(currency!,blocked).message,t):loading?<><LoaderCircle size={13} className="spin"/>{t("Searching companies…")}</>:items.length?t("↑ ↓ to browse · Enter to select"):t("No matching company. Try its stock ticker.")}</div></div>}</div>;
}
