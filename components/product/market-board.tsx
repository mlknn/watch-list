'use client';
import {createContext,useContext,useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {LoaderCircle,Search,Star} from 'lucide-react';
import catalog from '@/lib/market-dashboard.json';
import {PriceChart} from './price-chart';
import {CompanyIcon} from './company-icon';
import {StockSearch} from './stock-search';
import {Button} from '@/components/ui/button';
import {Tabs,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {price} from '@/lib/watchlist';
import {marketChart,type MarketChart} from '@/lib/market';
import {resolveStockInput} from '@/lib/stock-search.mjs';
import {apiJson} from '@/lib/auth-client';

type Row={symbol:string;name?:string;short?:string;chart:MarketChart|null;error:string|null};
type Board={fetchedAt:string;indices:(Row&{name:string})[];groups:{id:string;title:string;blurb:string;stocks:Row[]}[]};
type FavoriteState={signedIn:boolean;ids:Set<string>;rows:Row[];toggle:(symbol:string)=>void};

const Favorites=createContext<FavoriteState>({signedIn:false,ids:new Set(),rows:[],toggle:()=>{}});

function skeleton():Board{
  return {
    fetchedAt:'',
    indices:catalog.indices.map(item=>({...item,chart:null,error:null})),
    groups:catalog.groups.map(group=>({id:group.id,title:group.title,blurb:group.blurb,stocks:group.symbols.map(symbol=>({symbol,chart:null,error:null}))})),
  };
}

const INDEX_RANGES=[['1d','1D'],['1mo','1M'],['3mo','3M'],['1y','1Y'],['5y','5Y']] as const;

function Change({chart}:{chart:MarketChart}){
  const pct=chart.quote.changePercent;
  const up=(pct??0)>=0;
  return <span className={up?'up':'down'}>{pct===null?'—':`${up?'+':''}${pct.toFixed(2)}%`}</span>;
}

function FavoriteStar({symbol}:{symbol:string}){
  const {signedIn,ids,toggle}=useContext(Favorites);
  const on=ids.has(symbol);
  return <button type="button" className={'favorite-star'+(on?' is-on':'')} aria-label={on?'Remove from favorites':'Add to favorites'} title={on?'Remove from favorites':'Add to favorites'} onClick={e=>{e.preventDefault();e.stopPropagation();if(!signedIn){window.location.assign('/signup');return;}toggle(symbol);}}>
    <Star size={13} strokeWidth={2} fill={on?'currentColor':'none'}/>
  </button>;
}

function IndexHero({indices}:{indices:(Row&{name:string})[]}){
  const [symbol,setSymbol]=useState(indices[0]?.symbol||'^GSPC');
  const [range,setRange]=useState('1d');
  const [chart,setChart]=useState<MarketChart|null>(null);
  const [busy,setBusy]=useState(true);
  const [error,setError]=useState('');
  const selected=indices.find(row=>row.symbol===symbol)||indices[0];
  useEffect(()=>{let alive=true;setBusy(true);setError('');void marketChart(symbol,range).then(data=>{if(alive)setChart(data);}).catch(e=>{if(alive){setChart(null);setError((e as Error).message);}}).finally(()=>{if(alive)setBusy(false);});return()=>{alive=false;};},[symbol,range]);
  const quote=chart||selected?.chart||null;
  const change=quote?.quote.changePercent;
  return <section className="market-index-hero" aria-label="Major markets">
    <div className="market-index-toolbar">
      <Tabs value={symbol} onValueChange={v=>setSymbol(String(v))}>
        <TabsList className="market-index-picks" aria-label="Index">
          {indices.map(row=><TabsTrigger key={row.symbol} value={row.symbol}><span className="market-index-short">{row.short||row.name}</span></TabsTrigger>)}
        </TabsList>
      </Tabs>
      <Tabs value={range} onValueChange={v=>setRange(String(v))}>
        <TabsList className="chart-ranges market-index-ranges" aria-label="Chart time range">
          {INDEX_RANGES.map(([value,label])=><TabsTrigger key={value} value={value}>{label}</TabsTrigger>)}
        </TabsList>
      </Tabs>
    </div>
    <div className="market-index-quote-row">
      <div>
        <p className="eyebrow">{selected?.symbol.replace('^','')}</p>
        <h2>{selected?.name}</h2>
      </div>
      {quote?<div className="market-index-quote"><strong>{price(quote.quote.price,quote.currency)}</strong>{change!==null&&change!==undefined&&<Change chart={quote}/>}</div>:<p className="market-card-error">{error||'Loading…'}</p>}
    </div>
    <div className="market-index-stage" aria-busy={busy}>
      {chart&&chart.range===range?<PriceChart data={chart} className="index-hero-chart"/>:error&&!busy?<p className="market-card-error">{error}</p>:<div className="market-loading"><LoaderCircle className="spin"/>Loading index chart…</div>}
    </div>
  </section>;
}

function StockRow({row,pending}:{row:Row;pending:boolean}){
  const chart=row.chart;
  const href='/stocks/'+encodeURIComponent(row.symbol);
  return <div className="market-table-row">
    <span className="market-table-name"><FavoriteStar symbol={row.symbol}/><a href={href}><CompanyIcon symbol={row.symbol}/><span><strong>{chart?.companyName||row.name||row.symbol}</strong><small>{row.symbol}</small></span></a></span>
    <a className="market-table-price" href={href}>{chart?price(chart.quote.price,chart.currency):'—'}</a>
    <a className="market-table-change" href={href}>{chart?<Change chart={chart}/>:pending?<span className="market-card-pending">Loading…</span>:<span className="market-card-error">{row.error||'—'}</span>}</a>
    <a className="market-table-open" href={href}>Details</a>
  </div>;
}

function FavoritesBoard({rows}:{rows:Row[]}){
  if(!rows.length)return null;
  return <section className="market-group market-favorites" aria-label="Favorite stocks">
    <div className="market-group-copy">
      <p className="eyebrow">SAVED FOR THE TAPE</p>
      <h2>Favorites</h2>
      <p>Stocks you star on this dashboard. They stay here, separate from your watchlists.</p>
    </div>
    <div className="market-table" role="table" aria-label="Favorite stocks">
      <div className="market-table-head" role="row">
        <span>Company</span><span>Price</span><span>Today</span><span></span>
      </div>
      {rows.map(row=><StockRow key={row.symbol} row={row} pending={!row.chart&&!row.error}/>)}
    </div>
  </section>;
}

export function MarketBoard(){
  const router=useRouter();
  const inputRef=useRef<HTMLInputElement>(null);
  const [query,setQuery]=useState('');
  const [searchError,setSearchError]=useState('');
  const [searching,setSearching]=useState(false);
  const [data,setData]=useState<Board>(skeleton),[error,setError]=useState(''),[ready,setReady]=useState<Record<string,boolean>>({});
  const [signedIn,setSignedIn]=useState(false);
  const [favoriteRows,setFavoriteRows]=useState<Row[]>([]);
  useEffect(()=>{let alive=true;
    const loaded=new Set<string>();
    const queue=catalog.groups.map(group=>group.id);
    async function fetchGroup(id:string){
      const response=await fetch('/api/market?group='+encodeURIComponent(id),{cache:'no-store'});
      const result=await response.json() as {fetchedAt:string;group:{id:string;stocks:Row[]};error?:string};
      if(!response.ok)throw Error(result.error||'Market data is temporarily unavailable.');
      if(!alive)return;
      setData(prev=>({...prev,fetchedAt:result.fetchedAt,groups:prev.groups.map(group=>group.id===id?{...group,stocks:result.group.stocks}:group)}));
      setReady(prev=>({...prev,[id]:true}));
      setError('');
    }
    async function pump(){
      while(alive){
        const id=queue.find(group=>!loaded.has(group));
        if(!id)break;
        loaded.add(id);
        try{await fetchGroup(id);}catch(e){if(alive)setError((e as Error).message);}
        if(alive)await new Promise(resolve=>setTimeout(resolve,200));
      }
    }
    const observer=new IntersectionObserver(entries=>{
      for(const entry of entries){
        if(!entry.isIntersecting)continue;
        const id=entry.target.id;
        const index=queue.indexOf(id);
        if(index>0&&!loaded.has(id)){queue.splice(index,1);queue.unshift(id);}
      }
    },{rootMargin:'800px 0px'});
    const timer=window.setTimeout(()=>{
      for(const group of catalog.groups){const node=document.getElementById(group.id);if(node)observer.observe(node);}
    },0);
    void pump();
    return()=>{alive=false;observer.disconnect();clearTimeout(timer);};
  },[]);
  useEffect(()=>{let alive=true;void apiJson<{signedIn:boolean;favorites:Row[]}>('/api/favorites',undefined,false).then(result=>{if(!alive)return;setSignedIn(!!result.signedIn);setFavoriteRows(result.favorites||[]);}).catch(()=>{if(alive){setSignedIn(false);setFavoriteRows([]);}});return()=>{alive=false;};},[]);
  async function openStock(symbol:string){
    router.push('/stocks/'+encodeURIComponent(symbol));
  }
  async function search(e:React.FormEvent){
    e.preventDefault();
    if(!query.trim()){inputRef.current?.focus();return;}
    setSearching(true);setSearchError('');
    try{await openStock(await resolveStockInput(query));}
    catch(err){setSearchError((err as Error).message);}
    finally{setSearching(false);}
  }
  async function toggle(symbol:string){
    const on=favoriteRows.some(row=>row.symbol===symbol);
    setFavoriteRows(current=>on?current.filter(row=>row.symbol!==symbol):[{symbol,chart:null,error:null},...current.filter(row=>row.symbol!==symbol)]);
    try{
      const result=await apiJson<{signedIn:boolean;favorites:Row[]}>('/api/favorites',{symbol,favorite:!on});
      setSignedIn(true);
      setFavoriteRows(result.favorites||[]);
    }catch(e){
      setError((e as Error).message);
    }
  }
  const favoriteState:FavoriteState={signedIn,ids:new Set(favoriteRows.map(row=>row.symbol)),rows:favoriteRows,toggle};
  return <Favorites.Provider value={favoriteState}><main className="market-page">
    <div className="page-heading market-heading">
      <div>
        <p className="eyebrow">MARKETS, IN ONE PLACE</p>
        <h1>Today’s tape.</h1>
        <p className="intro">Look up any stock or ETF, open its chart and company details, then scroll the sectors. Earnings reports stay with Pro.</p>
      </div>
    </div>
    <form className="market-search" onSubmit={e=>void search(e)} role="search">
      <StockSearch value={query} onChange={v=>{setQuery(v);setSearchError('');}} inputRef={inputRef} onPick={symbol=>void openStock(symbol)}/>
      <Button type="submit" className="primary-button" disabled={searching}>{searching?<LoaderCircle className="spin"/>:<Search/>}<span className="market-search-label">Search</span></Button>
    </form>
    {searchError&&<p className="form-error" role="alert">{searchError}</p>}
    {error&&<p className="error-banner" role="alert">{error}</p>}
    <>
      <IndexHero indices={data.indices}/>
      <FavoritesBoard rows={favoriteRows}/>
      <nav className="market-sector-jump" aria-label="Industries">
        {data.groups.map(group=><a key={group.id} href={'#'+group.id}>{group.title}</a>)}
      </nav>
      {data.groups.map((group,index)=><section key={group.id} id={group.id} className="market-group">
        <div className="market-group-copy">
          <p className="eyebrow">{String(index+1).padStart(2,'0')}</p>
          <h2>{group.title}</h2>
          <p>{group.blurb}</p>
        </div>
        <div className="market-table" role="table" aria-label={group.title+' stocks'}>
          <div className="market-table-head" role="row">
            <span>Company</span><span>Price</span><span>Today</span><span></span>
          </div>
          {group.stocks.map(row=><StockRow key={row.symbol} row={row} pending={!ready[group.id]}/>)}
        </div>
      </section>)}
      <p className="market-footnote">Yahoo Finance · Quotes may be delayed{data.fetchedAt?` · Updated ${new Date(data.fetchedAt).toLocaleString()}`:''}. Charts are for looking, not advice. Click any row for details; quarterly earnings need Pro.</p>
    </>
  </main></Favorites.Provider>;
}
