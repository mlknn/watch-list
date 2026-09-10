'use client';
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {LoaderCircle,Search} from 'lucide-react';
import catalog from '@/lib/market-dashboard.json';
import {PriceChart} from './price-chart';
import {CompanyIcon} from './company-icon';
import {StockSearch} from './stock-search';
import {Button} from '@/components/ui/button';
import {Tabs,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {price} from '@/lib/watchlist';
import {marketChart,type MarketChart} from '@/lib/market';
import {resolveStockInput} from '@/lib/stock-search.mjs';

type Row={symbol:string;name?:string;chart:MarketChart|null;error:string|null};
type Board={fetchedAt:string;indices:(Row&{name:string})[];groups:{id:string;title:string;blurb:string;stocks:Row[]}[]};

function skeleton():Board{
  return {
    fetchedAt:'',
    indices:catalog.indices.map(item=>({...item,chart:null,error:null})),
    groups:catalog.groups.map(group=>({id:group.id,title:group.title,blurb:group.blurb,stocks:group.symbols.map(symbol=>({symbol,chart:null,error:null}))})),
  };
}

const INDEX_RANGES=[['1d','1 day'],['1mo','1 month'],['3mo','3 months'],['1y','1 year'],['5y','5 years']] as const;

function Change({chart}:{chart:MarketChart}){
  const pct=chart.quote.changePercent;
  const up=(pct??0)>=0;
  return <span className={up?'up':'down'}>{pct===null?'—':`${up?'+':''}${pct.toFixed(2)}%`}</span>;
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
  return <section className="market-index-hero" aria-label="Major US indexes">
    <div className="market-index-toolbar">
      <Tabs value={symbol} onValueChange={v=>setSymbol(String(v))}>
        <TabsList className="market-index-picks" aria-label="Index">
          {indices.map(row=><TabsTrigger key={row.symbol} value={row.symbol}>{row.name}</TabsTrigger>)}
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

function StockRow({row}:{row:Row}){
  const chart=row.chart;
  const href='/stocks/'+encodeURIComponent(row.symbol);
  return <a className="market-table-row" href={href}>
    <span className="market-table-name"><CompanyIcon symbol={row.symbol}/><span><strong>{chart?.companyName||row.name||row.symbol}</strong><small>{row.symbol}</small></span></span>
    <span className="market-table-price">{chart?price(chart.quote.price,chart.currency):'—'}</span>
    <span className="market-table-change">{chart?<Change chart={chart}/>:<span className="market-card-error">{row.error||'—'}</span>}</span>
    <span className="market-table-open">Details</span>
  </a>;
}

export function MarketBoard(){
  const router=useRouter();
  const inputRef=useRef<HTMLInputElement>(null);
  const [query,setQuery]=useState('');
  const [searchError,setSearchError]=useState('');
  const [searching,setSearching]=useState(false);
  const [data,setData]=useState<Board>(skeleton),[error,setError]=useState('');
  useEffect(()=>{let alive=true,running=false;
    async function load(){if(running)return;running=true;try{const response=await fetch('/api/market',{cache:'no-store'});const result=await response.json() as Board&{error?:string};if(!response.ok)throw Error(result.error||'Market data is temporarily unavailable.');if(alive){setData(result);setError('');}}catch(e){if(alive)setError((e as Error).message);}finally{running=false;}}
    void load();
    const timer=setInterval(()=>{if(!document.hidden)void load();},60000);
    return()=>{alive=false;clearInterval(timer);};
  },[]);
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
  return <main className="market-page">
    <div className="page-heading market-heading">
      <div>
        <p className="eyebrow">MARKETS, IN ONE PLACE</p>
        <h1>Today’s tape.</h1>
        <p className="intro">Look up any stock or ETF, open its chart and company details, then scroll the sectors. Earnings reports stay with Pro.</p>
      </div>
    </div>
    <form className="market-search" onSubmit={e=>void search(e)} role="search">
      <StockSearch value={query} onChange={v=>{setQuery(v);setSearchError('');}} inputRef={inputRef} onPick={symbol=>void openStock(symbol)}/>
      <Button type="submit" className="primary-button" disabled={searching}>{searching?<LoaderCircle className="spin"/>:<Search/>}Search</Button>
    </form>
    {searchError&&<p className="form-error" role="alert">{searchError}</p>}
    {error&&<p className="error-banner" role="alert">{error}</p>}
    <>
      <IndexHero indices={data.indices}/>
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
          {group.stocks.map(row=><StockRow key={row.symbol} row={row}/>)}
        </div>
      </section>)}
      <p className="market-footnote">Yahoo Finance · Quotes may be delayed{data.fetchedAt?` · Updated ${new Date(data.fetchedAt).toLocaleString()}`:''}. Charts are for looking, not advice. Click any row for details; quarterly earnings need Pro.</p>
    </>
  </main>;
}
