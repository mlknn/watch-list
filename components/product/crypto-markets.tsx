'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import {useRouter,useSearchParams} from 'next/navigation';
import {Search,Star,X} from 'lucide-react';
import {useT,T} from '@/components/product/language';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogDescription,DialogTitle} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {Tabs,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {PriceChart,type ChartStyle} from '@/components/product/price-chart';
import {marketChart,type MarketChart} from '@/lib/market';
import {chartPeriodStats} from '@/lib/chart-period.mjs';
import {tapeMovers} from '@/lib/market-tape.mjs';
import {getMarket,groupsFor,isCryptoCoin,listMarkets} from '@/lib/markets.mjs';
import {coinChange,cryptoCode,cryptoSymbolParam,filterCoins,sortCoins} from '@/lib/crypto-markets.mjs';
import {catalogName,getTickerSuggestions,resolveStockInput,searchTickerSuggestions} from '@/lib/stock-search.mjs';
import {price} from '@/lib/watchlist';
import {apiJson} from '@/lib/auth-client';
import {stockHref} from '@/lib/safe-return.mjs';

type Row={symbol:string;name?:string;chart:MarketChart|null;error:string|null};
type Suggestion={symbol:string;name:string};
const RANGES=[['1d','24H'],['5d','7D'],['1mo','1M'],['3mo','3M'],['ytd','YTD'],['1y','1Y'],['5y','5Y']] as const;

function displayName(symbol:string,chart?:MarketChart|null,fallback?:string){
  const fromChart=(chart?.companyName||'').replace(/\s+USD$/i,'').trim();
  return fromChart||fallback||catalogName(symbol)||cryptoCode(symbol);
}

function moveClass(pct:number|null){return pct==null||pct===0?'flat':pct>0?'up':'down';}
function arrow(pct:number|null){return pct==null||pct===0?'':pct>0?'▲':'▼';}
function pctText(pct:number|null){return pct==null?'—':`${pct>0?'+':''}${pct.toFixed(2)}%`;}

function Spark({points}:{points:{price:number}[]}){
  if(points.length<2)return null;
  const prices=points.map(point=>point.price);
  const min=Math.min(...prices);
  const max=Math.max(...prices);
  const span=max-min||1;
  const d=prices.map((value,index)=>{
    const x=(index/(prices.length-1))*64;
    const y=18-((value-min)/span)*16;
    return `${index?'L':'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
  const up=prices[prices.length-1]>=prices[0];
  return <svg className="crypto-spark" viewBox="0 0 64 20" aria-hidden="true"><path d={d} fill="none" stroke={up?'#14845b':'#b44450'} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round"/></svg>;
}

function Move({pct,suffix,className}:{pct:number|null;suffix?:string;className?:string}){
  return <span className={moveClass(pct)+(className?' '+className:'')}>{arrow(pct)} {pctText(pct)}{suffix?` ${suffix}`:''}</span>;
}

export function CryptoMarkets(){
  const t=useT();
  const router=useRouter();
  const params=useSearchParams();
  const market=useMemo(()=>getMarket('crypto'),[]);
  const leaders=market.indices;
  const coinSymbols=useMemo(()=>(groupsFor(market).find(group=>group.kind==='coins')?.symbols||[]) as string[],[market]);
  const etfMeta=useMemo(()=>market.etfs||[],[market]);
  const selected=cryptoSymbolParam(params.get('symbol'),coinSymbols.length?coinSymbols:leaders.map((item:{symbol:string})=>item.symbol));
  const inputRef=useRef<HTMLInputElement>(null);
  const [query,setQuery]=useState('');
  const [remote,setRemote]=useState<{q:string;items:Suggestion[]}|null>(null);
  const [searchOpen,setSearchOpen]=useState(false);
  const [searchIndex,setSearchIndex]=useState(-1);
  const [searchError,setSearchError]=useState('');
  const [leadCharts,setLeadCharts]=useState<Record<string,MarketChart|null>>({});
  const [leadErrors,setLeadErrors]=useState<Record<string,string>>({});
  const [coins,setCoins]=useState<Row[]>(()=>coinSymbols.map(symbol=>({symbol,chart:null,error:null})));
  const [coinsReady,setCoinsReady]=useState(false);
  const [coinsError,setCoinsError]=useState('');
  const [etfs,setEtfs]=useState<Row[]>(()=>etfMeta.map(item=>({symbol:item.symbol,name:item.name,chart:null,error:null})));
  const [etfsReady,setEtfsReady]=useState(false);
  const [chart,setChart]=useState<MarketChart|null>(null);
  const [chartKey,setChartKey]=useState('');
  const [chartError,setChartError]=useState('');
  const [range,setRange]=useState('1d');
  const [style,setStyle]=useState<ChartStyle>('line');
  const [filter,setFilter]=useState<'all'|'gainers'|'losers'>('all');
  const [sortKey,setSortKey]=useState<'change'|'price'>('change');
  const [attempt,setAttempt]=useState(0);
  const [favorites,setFavorites]=useState<string[]>([]);
  const [signedIn,setSignedIn]=useState(false);
  const [favoritePrompt,setFavoritePrompt]=useState(false);
  const quoteBySymbol=useMemo(()=>{
    const map=new Map<string,Row>();
    for(const row of coins)map.set(row.symbol,row);
    for(const item of leaders){
      const chartRow=leadCharts[item.symbol];
      if(chartRow)map.set(item.symbol,{symbol:item.symbol,name:item.name,chart:chartRow,error:leadErrors[item.symbol]||null});
    }
    return map;
  },[coins,leadCharts,leadErrors,leaders]);
  useEffect(()=>{
    let alive=true;
    for(const item of leaders){
      void marketChart(item.symbol,'1d').then(data=>{if(alive)setLeadCharts(prev=>({...prev,[item.symbol]:data}));},error=>{if(alive)setLeadErrors(prev=>({...prev,[item.symbol]:(error as Error).message}));});
    }
    return()=>{alive=false;};
  },[leaders,attempt]);
  useEffect(()=>{
    let alive=true;
    void fetch('/api/market?group=crypto-coins',{cache:'no-store'}).then(async response=>{
      const result=await response.json() as {group?:{stocks:Row[]};error?:string};
      if(!response.ok)throw Error(result.error||'Market data is temporarily unavailable.');
      if(!alive)return;
      setCoins(result.group?.stocks||[]);
      setCoinsReady(true);
      setCoinsError('');
    }).catch(error=>{if(alive){setCoinsError((error as Error).message);setCoinsReady(true);}});
    return()=>{alive=false;};
  },[attempt]);
  useEffect(()=>{
    let alive=true;
    void fetch('/api/market?group=crypto-etfs',{cache:'no-store'}).then(async response=>{
      const result=await response.json() as {group?:{stocks:Row[]};error?:string};
      if(!response.ok||!alive)return;
      const named=(result.group?.stocks||[]).map(row=>({...row,name:etfMeta.find(item=>item.symbol===row.symbol)?.name||row.name}));
      setEtfs(named);
      setEtfsReady(true);
    }).catch(()=>{if(alive)setEtfsReady(true);});
    return()=>{alive=false;};
  },[attempt,etfMeta]);
  useEffect(()=>{
    let alive=true;
    const symbol=selected;
    const nextRange=range;
    void marketChart(symbol,nextRange).then(data=>{
      if(!alive)return;
      setChart(data);
      setChartKey(symbol+':'+nextRange);
      setChartError('');
    },error=>{if(alive)setChartError((error as Error).message);});
    return()=>{alive=false;};
  },[selected,range,attempt]);
  useEffect(()=>{
    let alive=true;
    void apiJson<{signedIn:boolean;favorites:{symbol:string}[]}>('/api/favorites',undefined,false).then(result=>{
      if(!alive)return;
      setSignedIn(!!result.signedIn);
      setFavorites((result.favorites||[]).map(row=>row.symbol));
    }).catch(()=>{if(alive)setSignedIn(false);});
    return()=>{alive=false;};
  },[]);
  useEffect(()=>{
    const text=query.trim();
    if(text.length<2)return;
    const controller=new AbortController();
    const timer=window.setTimeout(()=>{
      void searchTickerSuggestions(text,8,controller.signal,'USD').then(items=>{
        if(!controller.signal.aborted)setRemote({q:text,items});
      }).catch(()=>{});
    },180);
    return()=>{clearTimeout(timer);controller.abort();};
  },[query]);
  const suggestions=remote&&remote.q===query.trim()?remote.items:getTickerSuggestions(query,8,'USD');
  const selectedRow=quoteBySymbol.get(selected);
  const selectedChart=chart&&chartKey===selected+':'+range?chart:(range==='1d'?leadCharts[selected]||null:null);
  const selectedName=displayName(selected,selectedChart||selectedRow?.chart,leaders.find(item=>item.symbol===selected)?.name);
  const headerQuote=selectedChart?.quote||selectedRow?.chart?.quote;
  const period=selectedChart?chartPeriodStats(selectedChart):null;
  const rangeLabel=t(RANGES.find(item=>item[0]===range)?.[1]||'24H');
  const periodMove=period?.changePercent==null?'':`${arrow(period.changePercent)} ${period.change==null?'':`${period.change>0?'+':''}${price(period.change,selectedChart?.currency||'USD')} `}(${pctText(period.changePercent)}) · ${rangeLabel}`;
  const updated=headerQuote?.quoteTime?new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit'}).format(new Date(headerQuote.quoteTime)):'';
  const board=sortCoins(filterCoins(coins,filter),sortKey);
  const movers=tapeMovers(coins.filter(row=>coinChange(row)!==null),3);
  function selectCoin(symbol:string){
    const next=cryptoSymbolParam(cryptoCode(symbol),coinSymbols);
    const search=new URLSearchParams(params.toString());
    search.set('market','crypto');
    search.set('symbol',cryptoCode(next));
    router.push('/dashboard?'+search.toString(),{scroll:false});
    setSearchOpen(false);
    setQuery('');
  }
  function openSymbol(symbol:string){
    const upper=symbol.toUpperCase();
    if(isCryptoCoin(upper)||coinSymbols.includes(upper+'-USD')||catalogName(upper.endsWith('-USD')?upper:upper+'-USD')){
      selectCoin(isCryptoCoin(upper)?upper:upper+'-USD');
      return;
    }
    router.push(stockHref(upper,'/dashboard?market=crypto'));
  }
  async function submitSearch(event:{preventDefault():void}){
    event.preventDefault();
    if(searchOpen&&suggestions.length){openSymbol(suggestions[searchIndex>=0?searchIndex:0].symbol);return;}
    if(!query.trim()){inputRef.current?.focus();return;}
    try{openSymbol(await resolveStockInput(query,'USD'));setSearchError('');}
    catch(error){setSearchError((error as Error).message);}
  }
  async function toggleFavorite(symbol:string){
    if(!signedIn){setFavoritePrompt(true);return;}
    const on=favorites.includes(symbol);
    setFavorites(current=>on?current.filter(item=>item!==symbol):[symbol,...current]);
    try{
      const result=await apiJson<{favorites:{symbol:string}[]}>('/api/favorites',{symbol,favorite:!on});
      setFavorites((result.favorites||[]).map(row=>row.symbol));
    }catch(error){setCoinsError((error as Error).message);}
  }
  function star(symbol:string){
    const on=favorites.includes(symbol);
    return <button type="button" className={'favorite-star'+(on?' is-on':'')} aria-label={`${on?t('Remove from favorites'):t('Add to favorites')} ${cryptoCode(symbol)}`} onClick={event=>{event.stopPropagation();void toggleFavorite(symbol);}}><Star size={14} fill={on?'currentColor':'none'}/></button>;
  }
  return <main className="market-page crypto-markets">
    <header className="crypto-heading">
      <div>
        <p className="eyebrow"><T text="CRYPTO MARKETS"/></p>
        <h1>{t('Crypto Markets')}</h1>
        <p className="intro">{t('Track Bitcoin, Ethereum, Solana and major cryptocurrencies around the clock.')}</p>
        <p className="crypto-status">{t('Open 24/7')}{updated?` · ${t('Updated')} ${updated} ET`:''}</p>
        <div className="market-picks" aria-label={t('Change the market')}>
          {listMarkets().map(item=>{
            const on=item.id==='crypto';
            return <Button key={item.id} type="button" variant="outline" className={'outline-button'+(on?' is-on':'')} aria-pressed={on} onClick={()=>router.push(item.id==='us'?'/dashboard':'/dashboard?market='+item.id)}>{t(item.id==='us'?'US':item.label)}</Button>;
          })}
        </div>
      </div>
    </header>
    <search className="market-search crypto-search">
      <form onSubmit={event=>void submitSearch(event)}>
      <div className="ticker-search-wrap">
        <div className="ticker-field">
          <Search size={18} aria-hidden="true"/>
          <Input ref={inputRef} aria-label={t('Search crypto — BTC, ETH, SOL...')} placeholder={t('Search crypto — BTC, ETH, SOL...')} value={query} autoComplete="off" onFocus={()=>setSearchOpen(true)} onChange={event=>{setQuery(event.target.value);setSearchOpen(true);setSearchError('');}} onKeyDown={event=>{
            if(event.key==='Escape'){setSearchOpen(false);return;}
            if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();setSearchIndex(index=>suggestions.length?(event.key==='ArrowDown'?(index+1)%suggestions.length:index<=0?suggestions.length-1:index-1):-1);}
          }}/>
          {query&&<button type="button" className="crypto-clear" aria-label={t('Clear search')} onClick={()=>{setQuery('');setSearchOpen(false);inputRef.current?.focus();}}><X size={16}/></button>}
        </div>
        {searchOpen&&!!query.trim()&&<div className="stock-search-popover"><ul className="stock-search-options">
          {suggestions.map((item,index)=>{
            const coin=isCryptoCoin(item.symbol);
            const row=quoteBySymbol.get(item.symbol);
            const pct=coinChange(row);
            return <li key={item.symbol}><button type="button" className={searchIndex===index?'is-on':''} onMouseDown={event=>event.preventDefault()} onClick={()=>openSymbol(item.symbol)}>
              <span className="crypto-suggestion-copy"><strong>{displayName(item.symbol,row?.chart,item.name)}</strong><small>{coin?cryptoCode(item.symbol):item.symbol}</small></span>
              {row?.chart&&<em className={moveClass(pct)}>{price(row.chart.quote.price,row.chart.currency)} <Move pct={pct}/></em>}
            </button></li>;
          })}
        </ul></div>}
      </div>
      </form>
    </search>
    {searchError&&<p className="form-error" role="alert">{searchError}</p>}
    <section className="crypto-pulse" aria-label={t('Crypto Markets')}>
      {leaders.map(item=>{
        const rowChart=leadCharts[item.symbol];
        const pct=rowChart?coinChange({chart:rowChart}):null;
        const on=item.symbol===selected;
        return <article key={item.symbol} className={'crypto-pulse-card'+(on?' is-on':'')}>
          {star(item.symbol)}
          <button type="button" className="crypto-pulse-hit" aria-pressed={on} onClick={()=>selectCoin(item.symbol)}>
          <span className="crypto-pulse-top"><span><strong>{item.name}</strong><small>{item.short}</small></span></span>
          {rowChart?<><b>{price(rowChart.quote.price,rowChart.currency)}</b><Move className="crypto-move" pct={pct} suffix={t('24H')}/><Spark points={rowChart.points}/>{rowChart.quote.change!=null&&<small className={'crypto-delta '+moveClass(pct)}>{rowChart.quote.change>0?'+':''}{price(rowChart.quote.change,rowChart.currency)}</small>}</>:<span className="crypto-skel crypto-skel-quote" aria-label={leadErrors[item.symbol]?t('Temporarily unavailable'):t('Loading quote…')}/>}
          {rowChart&&(rowChart.quote.dayHigh!=null||rowChart.quote.volume!=null)&&<span className="crypto-pulse-meta">
            {rowChart.quote.dayLow!=null&&rowChart.quote.dayHigh!=null&&<span>{t('24H range')} {price(rowChart.quote.dayLow,rowChart.currency)}–{price(rowChart.quote.dayHigh,rowChart.currency)}</span>}
            {rowChart.quote.volume!=null&&<span>{t('24H volume')} {new Intl.NumberFormat(undefined,{notation:'compact',maximumFractionDigits:2}).format(rowChart.quote.volume)}</span>}
          </span>}
          </button>
        </article>;
      })}
    </section>
    <section id="crypto-chart" className="crypto-chart-card">
      <div className="crypto-chart-head">
        <div>
          <h2>{selectedName} · {cryptoCode(selected)}</h2>
          {headerQuote?<p><strong>{price(headerQuote.price,selectedChart?.currency||selectedRow?.chart?.currency||'USD')}</strong> {periodMove?<span className={moveClass(period?.changePercent??null)}>{periodMove}</span>:<Move pct={headerQuote.changePercent??null} suffix={t('24H')}/>}</p>:<p className="crypto-skel crypto-skel-line" aria-label={t('Loading quote…')}/>}
        </div>
      </div>
      <div className="crypto-chart-stage" aria-busy={!selectedChart}>
        {chartError&&!selectedChart?<p role="alert">{t('Chart temporarily unavailable.')} <Button type="button" variant="ghost" onClick={()=>setAttempt(value=>value+1)}>{t('Retry')}</Button></p>:selectedChart?<PriceChart data={selectedChart} style={style}/>:<div className="crypto-skel crypto-skel-chart"/>}
      </div>
      <div className="chart-toolbar">
        <Tabs value={range} onValueChange={value=>setRange(String(value))}><TabsList className="chart-ranges" aria-label={t('Chart time range')}>{RANGES.map(([value,label])=><TabsTrigger key={value} value={value}>{t(label)}</TabsTrigger>)}</TabsList></Tabs>
        <Tabs value={style} onValueChange={value=>setStyle(value as ChartStyle)}><TabsList className="chart-ranges" aria-label={t('Chart type')}><TabsTrigger value="line">{t('Line')}</TabsTrigger><TabsTrigger value="candle">{t('Candle')}</TabsTrigger></TabsList></Tabs>
      </div>
    </section>
    <section className="crypto-movers" aria-label={t('Crypto movers')}>
      <div className="crypto-movers-copy">
        <h2>{t('Crypto movers')}</h2>
        <p>{t('Movers from tracked coins')}</p>
      </div>
      <div>
        <h3>{t('Top gainers')}</h3>
        {movers.gainers.map(row=><button type="button" key={row.symbol} onClick={()=>selectCoin(row.symbol)}><span>{displayName(row.symbol,row.chart)}</span><Move pct={coinChange(row)}/></button>)}
        {coinsReady&&!movers.gainers.length&&<p className="crypto-quiet">{t('No gainers in the tracked coins.')}</p>}
      </div>
      <div>
        <h3>{t('Top losers')}</h3>
        {movers.losers.map(row=><button type="button" key={row.symbol} onClick={()=>selectCoin(row.symbol)}><span>{displayName(row.symbol,row.chart)}</span><Move pct={coinChange(row)}/></button>)}
        {coinsReady&&!movers.losers.length&&<p className="crypto-quiet">{t('No losers in the tracked coins.')}</p>}
      </div>
    </section>
    <section className="crypto-board" aria-label={t('Coin board')}>
      <div className="crypto-board-head">
        <h2>{t('Coin board')}</h2>
        <div className="crypto-filters" aria-label={t('Coin board')}>
          {(['all','gainers','losers'] as const).map(mode=><Button key={mode} type="button" variant="outline" className={'outline-button'+(filter===mode?' is-on':'')} aria-pressed={filter===mode} onClick={()=>setFilter(mode)}>{t(mode==='all'?'All':mode==='gainers'?'Gainers':'Losers')}</Button>)}
          <Button type="button" variant="outline" className={'outline-button'+(sortKey==='change'?' is-on':'')} aria-pressed={sortKey==='change'} onClick={()=>setSortKey('change')}>{t('24H %')}</Button>
          <Button type="button" variant="outline" className={'outline-button'+(sortKey==='price'?' is-on':'')} aria-pressed={sortKey==='price'} onClick={()=>setSortKey('price')}>{t('Price')}</Button>
        </div>
      </div>
      {coinsError&&<p role="alert">{coinsError} <Button type="button" variant="ghost" onClick={()=>setAttempt(value=>value+1)}>{t('Retry')}</Button></p>}
      <div className="crypto-table">
        <div className="crypto-table-head"><span>{t('Coin')}</span><span>{t('Price')}</span><span>{t('24H')}</span></div>
        {(coinsReady?board:coinSymbols.map((symbol):Row=>({symbol,chart:null,error:null}))).map(row=>{
          const pct=coinChange(row);
          const failed=coinsReady&&!row.chart;
          return <div key={row.symbol} className={'crypto-row'+(row.symbol===selected?' is-on':'')}>
            {star(row.symbol)}
            <button type="button" className="crypto-row-hit" onClick={()=>selectCoin(row.symbol)}>
            <span className="crypto-row-name"><span><strong>{displayName(row.symbol,row.chart)}</strong><small>{cryptoCode(row.symbol)}</small></span></span>
            <span className="crypto-row-price">{row.chart?price(row.chart.quote.price,row.chart.currency):failed?<span className="crypto-quiet">{t('Temporarily unavailable')}</span>:<span className="crypto-skel crypto-skel-bit"/>}</span>
            <span className="crypto-row-change">{row.chart?<Move pct={pct}/>:!failed&&<span className="crypto-skel crypto-skel-bit"/>}</span>
            </button>
          </div>;
        })}
      </div>
    </section>
    <section className="crypto-etfs" aria-label={t('U.S. Spot Crypto ETFs')}>
      <h2>{t('U.S. Spot Crypto ETFs')}</h2>
      <p>{t('Exchange-traded products linked to bitcoin or ether. These trade during U.S. stock-market hours.')}</p>
      <div className="crypto-table">
        <div className="crypto-table-head"><span>{t('Fund')}</span><span>{t('Price')}</span><span>{t("Today's %")}</span></div>
        {(etfsReady?etfs:etfMeta.map(item=>({symbol:item.symbol,name:item.name,chart:null,error:null}))).map(row=>{
          const pct=coinChange(row);
          return <Link key={row.symbol} className="crypto-row" href={stockHref(row.symbol,'/dashboard?market=crypto')}>
            <span className="crypto-row-name"><span><strong>{row.symbol}</strong><small>{displayName(row.symbol,row.chart,row.name)}</small></span></span>
            <span className="crypto-row-price">{row.chart?price(row.chart.quote.price,row.chart.currency):<span className="crypto-skel crypto-skel-bit"/>}</span>
            <span className="crypto-row-change">{row.chart?<Move pct={pct} suffix={t('Today')}/>:<span className="crypto-skel crypto-skel-bit"/>}</span>
          </Link>;
        })}
      </div>
    </section>
    <p className="market-footnote">{t('Yahoo Finance · Quotes may be delayed')} · {t('Crypto never closes. Click a coin for the chart. Not advice.')}</p>
    <Dialog open={favoritePrompt} onOpenChange={setFavoritePrompt}>
      <DialogContent className="list-dialog">
        <DialogTitle>{t('Favorites need an account')}</DialogTitle>
        <DialogDescription>{t('Favorites pin names on Markets. They are not a watchlist and do not record a starting price. You can keep browsing without signing in.')}</DialogDescription>
        <div className="add-stock-actions">
          <Button variant="outline" className="outline-button" onClick={()=>setFavoritePrompt(false)}>{t('Continue browsing')}</Button>
          <Link className="solid-link" href={'/login?next='+encodeURIComponent('/dashboard?market=crypto&symbol='+cryptoCode(selected))}>{t('Sign in')}</Link>
        </div>
      </DialogContent>
    </Dialog>
  </main>;
}
