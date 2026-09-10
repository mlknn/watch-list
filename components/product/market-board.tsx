'use client';
import {createContext,useContext,useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {LoaderCircle,Maximize2,Search,Star} from 'lucide-react';
import catalog from '@/lib/market-dashboard.json';
import {PriceChart,type ChartStyle} from './price-chart';
import {CompanyIcon} from './company-icon';
import {StockSearch} from './stock-search';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogDescription,DialogTitle} from '@/components/ui/dialog';
import {Tabs,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {price} from '@/lib/watchlist';
import {marketChart,type MarketChart} from '@/lib/market';
import {chartPeriodStats} from '@/lib/chart-period.mjs';
import {nyseSession,sectorAverage,tapeBreadth,tapeMovers,uniqueQuoted} from '@/lib/market-tape.mjs';
import {resolveStockInput} from '@/lib/stock-search.mjs';
import {apiJson} from '@/lib/auth-client';

type Row={symbol:string;name?:string;short?:string;chart:MarketChart|null;error:string|null};
type Board={fetchedAt:string;indices:(Row&{name:string})[];groups:{id:string;title:string;blurb:string;stocks:Row[]}[]};
type FavoriteState={signedIn:boolean;ids:Set<string>;rows:Row[];toggle:(symbol:string)=>void};

const Favorites=createContext<FavoriteState>({signedIn:false,ids:new Set(),rows:[],toggle:()=>{}});
type Sort={key:'name'|'price'|'change';dir:1|-1};

function dayPct(row:Row){return typeof row.chart?.quote.changePercent==='number'?row.chart.quote.changePercent:null;}
function fmtPct(pct:number|null){return pct===null||pct===undefined?'—':`${pct>=0?'+':''}${pct.toFixed(2)}%`;}

function SessionBadge(){
  const [now,setNow]=useState(()=>new Date());
  useEffect(()=>{const id=window.setInterval(()=>setNow(new Date()),30000);return()=>clearInterval(id);},[]);
  const session=nyseSession(now);
  const clock=new Intl.DateTimeFormat(undefined,{timeZone:'America/New_York',hour:'numeric',minute:'2-digit'}).format(now);
  return <aside className={'market-session is-'+session.code} aria-live="polite">
    <strong><span className="market-session-dot" aria-hidden="true"/>{session.label}</strong>
    <span>{session.detail}</span>
    <small>{clock} ET</small>
  </aside>;
}

function TapeStrip({rows}:{rows:Row[]}){
  const breadth=tapeBreadth(rows);
  const {gainers,losers}=tapeMovers(rows,5);
  if(!breadth.quoted)return null;
  return <section className="market-tape" aria-label="Today on this tape">
    <div className="market-breadth">
      <div>
        <p className="eyebrow">ON THIS TAPE</p>
        <h2>Advance / decline</h2>
        <p>{breadth.up} up · {breadth.down} down{breadth.flat?` · ${breadth.flat} unchanged`:''} among {breadth.quoted} names loaded so far.</p>
      </div>
      <div className="market-breadth-bar" aria-hidden="true"><span className="up" style={{flexGrow:Math.max(breadth.up,0.01)}}/><span className="down" style={{flexGrow:Math.max(breadth.down,0.01)}}/></div>
    </div>
    <div className="market-movers">
      <div>
        <p className="eyebrow">LEADERS</p>
        <h3>Gainers</h3>
        {gainers.map(row=><a key={'g-'+row.symbol} href={'/stocks/'+encodeURIComponent(row.symbol)}><CompanyIcon symbol={row.symbol}/><span>{row.symbol}</span><em className="up">{fmtPct(dayPct(row))}</em></a>)}
      </div>
      <div>
        <p className="eyebrow">LAGGARDS</p>
        <h3>Losers</h3>
        {losers.map(row=><a key={'l-'+row.symbol} href={'/stocks/'+encodeURIComponent(row.symbol)}><CompanyIcon symbol={row.symbol}/><span>{row.symbol}</span><em className="down">{fmtPct(dayPct(row))}</em></a>)}
      </div>
    </div>
  </section>;
}

function Heatmap({rows}:{rows:Row[]}){
  const quoted=[...uniqueQuoted(rows)].sort((a,b)=>Math.abs(b.chart!.quote.changePercent!)-Math.abs(a.chart!.quote.changePercent!));
  if(quoted.length<6)return null;
  return <section className="market-heat-wrap" aria-label="Price heatmap">
    <div className="market-group-copy">
      <p className="eyebrow">ONE GLANCE</p>
      <h2>Heatmap.</h2>
      <p>Every loaded name, colored by today’s move. Darker cells swung more.</p>
    </div>
    <div className="market-heat">
      {quoted.map(row=>{
        const pct=row.chart!.quote.changePercent!;
        const t=Math.min(Math.abs(pct)/5,1);
        return <a key={row.symbol} className={'market-heat-cell '+(pct>=0?'up':'down')} href={'/stocks/'+encodeURIComponent(row.symbol)} style={{background:pct>=0?`rgba(35,131,98,${0.14+t*0.42})`:`rgba(190,77,89,${0.14+t*0.42})`}}>
          <strong>{row.symbol}</strong>
          <span>{fmtPct(pct)}</span>
        </a>;
      })}
    </div>
  </section>;
}

function sortRows(rows:Row[],sort:Sort|null){
  if(!sort)return rows;
  return [...rows].sort((a,b)=>{
    let av:number|string|null=null;let bv:number|string|null=null;
    if(sort.key==='name'){av=(a.chart?.companyName||a.symbol).toUpperCase();bv=(b.chart?.companyName||b.symbol).toUpperCase();}
    if(sort.key==='price'){av=a.chart?.quote.price??null;bv=b.chart?.quote.price??null;}
    if(sort.key==='change'){av=dayPct(a);bv=dayPct(b);}
    if(av==null&&bv==null)return 0;
    if(av==null)return 1;
    if(bv==null)return -1;
    if(typeof av==='string'&&typeof bv==='string')return av.localeCompare(bv)*sort.dir;
    return ((av as number)-(bv as number))*sort.dir;
  });
}

function SortHead({label,k,sort,onSort}:{label:string;k:Sort['key'];sort:Sort|null;onSort:(key:Sort['key'])=>void}){
  const on=sort?.key===k;
  return <button type="button" className={'market-sort'+(on?' is-on':'')} onClick={()=>onSort(k)}>{label}{on?(sort!.dir>0?' ↑':' ↓'):''}</button>;
}

function skeleton():Board{
  return {
    fetchedAt:'',
    indices:catalog.indices.map(item=>({...item,chart:null,error:null})),
    groups:catalog.groups.map(group=>({id:group.id,title:group.title,blurb:group.blurb,stocks:group.symbols.map(symbol=>({symbol,chart:null,error:null}))})),
  };
}

const INDEX_RANGES=[['1d','1D'],['1mo','1M'],['3mo','3M'],['1y','1Y'],['5y','5Y']] as const;

function Change({chart}:{chart:MarketChart}){
  const {changePercent:pct,up}=chartPeriodStats(chart);
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
  const [range,setRange]=useState('1d');
  const [style,setStyle]=useState<ChartStyle>('line');
  const [charts,setCharts]=useState<Record<string,MarketChart|null>>({});
  const [errors,setErrors]=useState<Record<string,string>>({});
  const [busy,setBusy]=useState(true);
  const [expanded,setExpanded]=useState<string|null>(null);
  useEffect(()=>{
    let alive=true;setBusy(true);
    void Promise.all(indices.map(row=>marketChart(row.symbol,range).then(data=>[row.symbol,{data,error:''}] as const,e=>[row.symbol,{data:null,error:(e as Error).message}] as const))).then(rows=>{
      if(!alive)return;
      const nextCharts:Record<string,MarketChart|null>={};const nextErrors:Record<string,string>={};
      for(const [symbol,result] of rows){nextCharts[symbol]=result.data;nextErrors[symbol]=result.error;}
      setCharts(nextCharts);setErrors(nextErrors);setBusy(false);
    });
    return()=>{alive=false;};
  },[indices,range]);
  return <section className="market-index-hero" aria-label="Major markets">
    <div className="market-index-toolbar">
      <Tabs value={style} onValueChange={v=>setStyle(v as ChartStyle)}>
        <TabsList className="chart-ranges market-index-style" aria-label="Chart type">
          <TabsTrigger value="line">Line</TabsTrigger>
          <TabsTrigger value="candle">Candle</TabsTrigger>
        </TabsList>
      </Tabs>
      <Tabs value={range} onValueChange={v=>setRange(String(v))}>
        <TabsList className="chart-ranges market-index-ranges" aria-label="Chart time range">
          {INDEX_RANGES.map(([value,label])=><TabsTrigger key={value} value={value}>{label}</TabsTrigger>)}
        </TabsList>
      </Tabs>
    </div>
    <div className="market-index-grid" aria-busy={busy}>
      {indices.map(row=>{
        const chart=charts[row.symbol]||null;
        return <article key={row.symbol} className="market-index-card">
          <div className="market-index-card-head">
            <div>
              <p className="eyebrow">{row.short||row.name}</p>
              <h3>{row.name}</h3>
            </div>
            {chart?<div className="market-index-quote"><strong>{price(chart.quote.price,chart.currency)}</strong><Change chart={chart}/></div>:<p className="market-card-error">{errors[row.symbol]||'Loading…'}</p>}
            <button type="button" className="index-expand" aria-label={'Expand '+row.name+' chart'} title="Expand chart" onClick={()=>setExpanded(row.symbol)}><Maximize2 size={13}/></button>
          </div>
          {chart&&chart.range===range?<PriceChart data={chart} compact style={style} className="index-hero-chart"/>:busy?<div className="market-loading"><LoaderCircle className="spin"/></div>:<p className="market-card-error">{errors[row.symbol]||'Chart unavailable.'}</p>}
        </article>;
      })}
    </div>
    {(()=>{
      const row=indices.find(item=>item.symbol===expanded);
      const chart=expanded?charts[expanded]||null:null;
      return <Dialog open={!!expanded} onOpenChange={v=>{if(!v)setExpanded(null);}}>
        <DialogContent className="full-chart-dialog index-chart-dialog">
          <DialogTitle>{row?.name||expanded}</DialogTitle>
          <DialogDescription>{chart?`${price(chart.quote.price,chart.currency)} · ${chart.sessionDate||chart.range}`:'Expanded index chart'}</DialogDescription>
          <div className="market-index-toolbar">
            <Tabs value={style} onValueChange={v=>setStyle(v as ChartStyle)}>
              <TabsList className="chart-ranges market-index-style" aria-label="Chart type">
                <TabsTrigger value="line">Line</TabsTrigger>
                <TabsTrigger value="candle">Candle</TabsTrigger>
              </TabsList>
            </Tabs>
            <Tabs value={range} onValueChange={v=>setRange(String(v))}>
              <TabsList className="chart-ranges market-index-ranges" aria-label="Chart time range">
                {INDEX_RANGES.map(([value,label])=><TabsTrigger key={value} value={value}>{label}</TabsTrigger>)}
              </TabsList>
            </Tabs>
          </div>
          {chart&&chart.range===range?<PriceChart data={chart} style={style} className="index-expanded-chart"/>:busy?<div className="market-loading"><LoaderCircle className="spin"/></div>:<p className="market-card-error">{(expanded&&errors[expanded])||'Chart unavailable.'}</p>}
        </DialogContent>
      </Dialog>;
    })()}
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
  const [sorts,setSorts]=useState<Record<string,Sort|null>>({});
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
  const quotedRows=data.groups.flatMap(group=>group.stocks);
  function cycleSort(id:string,key:Sort['key']){
    setSorts(prev=>{
      const cur=prev[id];
      if(!cur||cur.key!==key)return {...prev,[id]:{key,dir:key==='name'?1:-1}};
      return {...prev,[id]:{key,dir:cur.dir===1?-1:1}};
    });
  }
  return <Favorites.Provider value={favoriteState}><main className="market-page">
    <div className="page-heading market-heading">
      <div>
        <p className="eyebrow">MARKETS, IN ONE PLACE</p>
        <h1>Today’s tape.</h1>
        <p className="intro">Look up any stock or ETF, open its chart and company details, then scroll the sectors. Earnings reports stay with Pro.</p>
      </div>
      <SessionBadge/>
    </div>
    <form className="market-search" onSubmit={e=>void search(e)} role="search">
      <StockSearch value={query} onChange={v=>{setQuery(v);setSearchError('');}} inputRef={inputRef} onPick={symbol=>void openStock(symbol)}/>
      <Button type="submit" className="primary-button" disabled={searching}>{searching?<LoaderCircle className="spin"/>:<Search/>}<span className="market-search-label">Search</span></Button>
    </form>
    {searchError&&<p className="form-error" role="alert">{searchError}</p>}
    {error&&<p className="error-banner" role="alert">{error}</p>}
    <>
      <IndexHero indices={data.indices}/>
      <TapeStrip rows={quotedRows}/>
      <Heatmap rows={quotedRows}/>
      <FavoritesBoard rows={favoriteRows}/>
      <nav className="market-sector-jump" aria-label="Industries">
        {data.groups.map(group=>{
          const avg=ready[group.id]?sectorAverage(group.stocks):null;
          return <a key={group.id} href={'#'+group.id} className={avg==null?'':avg>=0?'is-up':'is-down'}>{group.title}{avg!==null&&<small>{fmtPct(avg)}</small>}</a>;
        })}
      </nav>
      {data.groups.map((group,index)=>{
        const avg=ready[group.id]?sectorAverage(group.stocks):null;
        const sort=sorts[group.id]||null;
        return <section key={group.id} id={group.id} className="market-group">
          <div className="market-group-copy">
            <p className="eyebrow">{String(index+1).padStart(2,'0')}</p>
            <h2>{group.title}{avg!==null&&<span className={avg>=0?'up':'down'}>{fmtPct(avg)}</span>}</h2>
            <p>{group.blurb}</p>
          </div>
          <div className="market-table" role="table" aria-label={group.title+' stocks'}>
            <div className="market-table-head" role="row">
              <SortHead label="Company" k="name" sort={sort} onSort={key=>cycleSort(group.id,key)}/>
              <SortHead label="Price" k="price" sort={sort} onSort={key=>cycleSort(group.id,key)}/>
              <SortHead label="Today" k="change" sort={sort} onSort={key=>cycleSort(group.id,key)}/>
              <span></span>
            </div>
            {sortRows(group.stocks,sort).map(row=><StockRow key={row.symbol} row={row} pending={!ready[group.id]}/>)}
          </div>
        </section>;
      })}
      <p className="market-footnote">Yahoo Finance · Quotes may be delayed{data.fetchedAt?` · Updated ${new Date(data.fetchedAt).toLocaleString()}`:''}. Charts are for looking, not advice. Click any row for details; quarterly earnings need Pro.</p>
    </>
  </main></Favorites.Provider>;
}
