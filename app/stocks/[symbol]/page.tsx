'use client';
import {useT} from "@/components/product/language";
import {T} from '@/components/product/language';
import {use,useEffect,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {ArrowUpRight,ArrowDownRight,Plus,Maximize2,RefreshCw,LoaderCircle,Moon,Star} from 'lucide-react';
import {PublicNav,PublicFooter} from '@/components/product/nav';
import {PositionFields,emptyPosition,type PositionDraft} from '@/components/product/position-fields';
import {PriceChart,type ChartStyle} from '@/components/product/price-chart';
import {Button} from '@/components/ui/button';
import {Tabs,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';

import {DailyMove} from '@/components/product/daily-move';
import {EarningsStory,StockFactsRail} from '@/components/product/earnings-story';
import {MarketLockBanner} from '@/components/product/market-lock-banner';
import {useIsMobile} from '@/hooks/use-mobile';
import {marketChart,stockDataFetch,type MarketChart} from '@/lib/market';
import {price,quoteTime,quoteUnit,type AccountState} from '@/lib/watchlist';
import {safeReturnPath} from '@/lib/safe-return.mjs';
import {apiJson,signedIn as hasAccount} from '@/lib/auth-client';
import {track} from '@/lib/analytics';
import {applyGuestAction,ensureGuestList,writeGuestState} from '@/lib/guest-watchlist.mjs';
import {parseCurrencyMismatch} from '@/lib/portfolio-currency.mjs';
import {isCryptoCoin} from '@/lib/markets.mjs';
type Fundamentals={available:boolean;companyName?:string;description?:string;sector?:string;industry?:string;website?:string;employees?:number;country?:string;marketCap?:number;revenue?:number;netIncome?:number;eps?:number;shares?:number;pe?:number;forwardPe?:number;dividendRate?:number;dividendYield?:number;exDividendDate?:string;beta?:number;analysts?:string;targetPrice?:number;earningsDate?:string;postMarketPrice?:number;postMarketTime?:string;fetchedAt?:string;error?:string};
const ranges=[['1d','1D'],['5d','5D'],['1mo','1M'],['3mo','3M'],['6mo','6M'],['ytd','YTD'],['1y','1Y'],['5y','5Y'],['max','Max']];
const compact=(v:number|undefined)=>v===undefined?'—':new Intl.NumberFormat(undefined,{notation:'compact',maximumFractionDigits:2}).format(v);
const num=(v:number|undefined)=>v===undefined?'—':v.toLocaleString(undefined,{maximumFractionDigits:2});
export default function StockDetails({params}:{params:Promise<{symbol:string}>}){const t=useT();
  const [position,setPosition]=useState<PositionDraft>(emptyPosition);
  const [favoritePrompt,setFavoritePrompt]=useState(false);
  const mobile=useIsMobile();
  const searchParams=useSearchParams();
  const backHref=safeReturnPath(searchParams.get('from'),'/dashboard');
  const backLabel=backHref.startsWith('/watchlists')?t('← Watchlists'):backHref.startsWith('/earnings')?t('← Earnings'):backHref.startsWith('/dashboard')?t('← Markets'):t('← Home');
  const {symbol:raw}=use(params);const symbol=raw.toUpperCase();const crypto=isCryptoCoin(symbol);const [range,setRange]=useState('1d'),[chartStyle,setChartStyle]=useState<ChartStyle>('line'),[chart,setChart]=useState<MarketChart|null>(null),[overview,setOverview]=useState<MarketChart|null>(null),[fund,setFund]=useState<Fundamentals|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[full,setFull]=useState(false),[adding,setAdding]=useState(false),[account,setAccount]=useState<AccountState|null>(null),[listId,setListId]=useState(''),[addError,setAddError]=useState(''),[saving,setSaving]=useState(false),[saved,setSaved]=useState(''),[version,setVersion]=useState(0),[favorite,setFavorite]=useState(false),[signedIn,setSignedIn]=useState(false),[savingFavorite,setSavingFavorite]=useState(false),[rail,setRail]=useState(true);
  useEffect(()=>{let alive=true;setBusy(true);setError('');void marketChart(symbol,range).then(data=>{if(alive){setChart(data);if(range==='1d')setOverview(data);}}).catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setBusy(false);});return()=>{alive=false;};},[symbol,range,version]);
  useEffect(()=>{let alive=true;void marketChart(symbol,'1d').then(data=>{if(alive)setOverview(data);}).catch(()=>{});const timer=setInterval(()=>{if(!document.hidden)setVersion(v=>v+1);},60000);return()=>{alive=false;clearInterval(timer);};},[symbol,version]);
  useEffect(()=>{if(crypto){setFund({available:false});return;}let alive=true;void stockDataFetch('/api/stocks/'+encodeURIComponent(symbol)+'/fundamentals').then(async r=>{const value=await r.json() as Fundamentals;if(alive)setFund(value);}).catch(()=>{if(alive)setFund({available:false});});return()=>{alive=false;};},[symbol,crypto]);
  useEffect(()=>{let alive=true;void apiJson<{signedIn:boolean;favorites:{symbol:string}[]}>('/api/favorites',undefined,false).then(result=>{if(!alive)return;setSignedIn(!!result.signedIn);setFavorite(!!result.favorites?.some(row=>row.symbol===symbol));}).catch(()=>{if(alive){setSignedIn(false);setFavorite(false);}});return()=>{alive=false;};},[symbol]);
  const data=overview||chart;
  const quote=overview?.quote||data?.quote;
  const change=quote?.changePercent;
  const dollar=quote?.change;
  const direction=change!==null&&change!==undefined&&change<0?'down':'up';
  const ChangeIcon=direction==='down'?ArrowDownRight:ArrowUpRight;
  const unit=quoteUnit({symbol,quoteType:data?.quoteType});
  const formatQuote=(value:number)=>price(value,data?.currency||'USD',unit);
  async function openAdd(){setAdding(true);setAddError('');setSaved('');try{if(await hasAccount()){const result=await apiJson<AccountState>('/api/watchlists');setAccount(result);setListId(result.watchlists[0]?.id||'');return;}const guest=ensureGuestList(window.localStorage);setAccount(guest);setListId(guest.watchlists[0].id);}catch(e){setAddError((e as Error).message);}}
  async function toggleFavorite(){if(!signedIn){setFavoritePrompt(true);return;}const next=!favorite;setFavorite(next);setSavingFavorite(true);try{const result=await apiJson<{signedIn:boolean;favorites:{symbol:string}[]}>('/api/favorites',{symbol,favorite:next});setSignedIn(true);setFavorite(!!result.favorites?.some(row=>row.symbol===symbol));}catch(e){setFavorite(!next);setError((e as Error).message);}finally{setSavingFavorite(false);}}
  function positionPayload(){
    const quantity=position.quantity.trim();
    if(!quantity)return {notes:position.notes};
    return {quantity:Number(quantity),costPerShare:position.cost?Number(position.cost):undefined,acquiredAt:new Date(position.date+'T00:00:00').toISOString(),notes:position.notes};
  }
  async function add(){setSaving(true);setAddError('');try{if(account?.guest){const firstStock=!account.watchlists.some(list=>list.stocks.length);const chart=await marketChart(symbol);const quote={symbol:chart.symbol,companyName:chart.companyName,currency:chart.currency,exchange:chart.exchange,price:chart.quote.price,quoteTime:chart.quote.quoteTime||chart.fetchedAt,checkedAt:chart.fetchedAt};const result=writeGuestState(applyGuestAction(account,{action:'addStock',listId,ticker:symbol,...positionPayload()},quote),window.localStorage);setAccount(result);setSaved(`${symbol} was added with the latest available price.`);if(firstStock)track('watchlist_created');return;}const result=await apiJson<AccountState>('/api/watchlists',{action:'addStock',listId,ticker:symbol,...positionPayload()});setAccount(result);setSaved(`${symbol} was added with the latest available price.`);}catch(e){setAddError((e as Error).message);}finally{setSaving(false);}}
  const na=t('Not available');
  const leftMetrics:[string,string][]=[[t("Market cap"),fund?.marketCap===undefined?na:compact(fund.marketCap)],[t("Revenue (TTM)"),fund?.revenue===undefined?na:compact(fund.revenue)],[t("Net income"),fund?.netIncome===undefined?na:compact(fund.netIncome)],[t("EPS"),fund?.eps===undefined?na:num(fund.eps)],[t("Shares outstanding"),fund?.shares===undefined?na:compact(fund.shares)],[t("P/E ratio"),fund?.pe===undefined?na:num(fund.pe)],[t("Forward P/E"),fund?.forwardPe===undefined?na:num(fund.forwardPe)],[t("Dividend yield"),fund?.dividendYield===undefined?na:(fund.dividendYield*100).toFixed(2)+'%'],[t("Ex-dividend date"),fund?.exDividendDate?new Date(fund.exDividendDate).toLocaleDateString():na]];
  const rightMetrics:[string,string][]=[[t("Volume"),!data||data.quote.volume==null?na:compact(data.quote.volume)],[t("Open"),data?.quote.open==null?na:formatQuote(data.quote.open)],[t("Previous close"),data?.quote.previousClose==null?na:formatQuote(data.quote.previousClose)],[t("Day’s range"),data?.quote.dayLow==null||data.quote.dayHigh==null?na:`${data.quote.dayLow.toFixed(2)} – ${data.quote.dayHigh.toFixed(2)}`],[t("52-week range"),data?.quote.fiftyTwoWeekLow==null||data.quote.fiftyTwoWeekHigh==null?na:`${data.quote.fiftyTwoWeekLow.toFixed(2)} – ${data.quote.fiftyTwoWeekHigh.toFixed(2)}`],[t("Beta"),fund?.beta===undefined?na:num(fund.beta)],[t("Analyst consensus"),fund?.analysts?fund.analysts.replace(/_/g,' '):na],[t("Price target"),fund?.targetPrice===undefined||!data?na:formatQuote(fund.targetPrice)],[t("Next earnings date (estimated)"),fund?.earningsDate?new Date(fund.earningsDate).toLocaleDateString():na]];
  const rangeControls=<Tabs value={range} onValueChange={v=>setRange(String(v))}><TabsList className="chart-ranges" aria-label="Chart time range">{ranges.map(([value,label])=><TabsTrigger key={value} value={value}>{label}</TabsTrigger>)}</TabsList></Tabs>;
  const styleControls=<Tabs value={chartStyle} onValueChange={v=>setChartStyle(v as ChartStyle)}><TabsList className="chart-ranges chart-style-toggle" aria-label="Chart type"><TabsTrigger value="line">{t("Line")}</TabsTrigger><TabsTrigger value="candle">{t("Candle")}</TabsTrigger></TabsList></Tabs>;
  const facts:[string,string][]=[...leftMetrics,...rightMetrics];
  const factGroups=[{title:t('Valuation'),items:leftMetrics.slice(0,4)},{title:t('Profitability'),items:leftMetrics.slice(4)},{title:t('Trading'),items:rightMetrics.slice(0,5)},{title:t('Company facts'),items:rightMetrics.slice(5)}];
  const eventDates=chart?.earningsDates||[];
  const chartEvents=mobile&&(range==='5y'||range==='max')?undefined:eventDates;
  const coinTitle=(data?.companyName||symbol).replace(/\s+USD$/i,'');
  const coinCode=symbol.replace(/-USD$/,'');
  if(crypto){
    return <>
      <PublicNav/>
      <main className="stock-detail-page is-crypto-chart">
        <div className="stock-back-row"><a className="stock-back" href={backHref.startsWith('/dashboard')?backHref:'/dashboard?market=crypto'}>{backHref.startsWith('/dashboard')?backLabel:t("← Markets")}</a></div>
        <div className="stock-summary-card">
          <h1>{coinTitle} <span>({coinCode})</span></h1>
          {data&&<div className="detail-prices"><div className="detail-price"><strong>{formatQuote(data.quote.price)}</strong>{change!==null&&change!==undefined&&<span className={direction}><ChangeIcon size={21}/>{change>=0?'+':''}{change.toFixed(2)}%</span>}</div></div>}
        </div>
        <DailyMove symbol={symbol} chart={overview||chart}/>
        {error&&<div className="error-banner" role="alert">{error}<Button variant="ghost" onClick={()=>setVersion(v=>v+1)}>Retry</Button></div>}
        <section className="main-chart-panel story-card">
          <div className="chart-toolbar">{styleControls}{rangeControls}<Button variant="ghost" size="icon" aria-label="Refresh stock chart" disabled={busy} onClick={()=>setVersion(v=>v+1)}><RefreshCw className={busy?'spin':''}/></Button></div>
          <div className="chart-stage" aria-busy={busy}>{chart&&chart.range===range?<PriceChart data={chart} style={chartStyle}/>:<div className="chart-empty"><LoaderCircle className="spin"/>{t("Loading chart…")}</div>}</div>
          <div className="chart-caption"><span>{chart?.sessionDate||'—'}</span><span>{chart?.timezone}</span></div>
        </section>
        <footer className="workspace-footer"><span>Yahoo Finance · Quotes may be delayed</span><span>{t('Crypto never closes. Click a coin for the chart. Not advice.')}</span></footer>
      </main>
      <PublicFooter/>
    </>;
  }
  return <><PublicNav/><main className="stock-detail-page"><div className="stock-back-row"><a className="stock-back" href={backHref}>{backLabel}</a><a className="stock-back" href="/earnings">{t("Earnings calendar")}</a></div><div className="stock-summary-card"><div className="detail-title-row"><div className="company-title-block"><div className="company-name-line"><h1>{data?.companyName||symbol} <span>({symbol})</span></h1></div><p>{data?`${data.exchange} · ${data.currency}`:t('Stock details')}</p></div><div className="heading-actions"><Button variant="outline" className={'outline-button favorite-action'+(favorite?' is-on':'')} title={favorite?t("Favorited"):t("Favorite")} disabled={savingFavorite} onClick={()=>void toggleFavorite()}><Star size={16} fill={favorite?'currentColor':'none'}/>{favorite?t("Favorited"):t("Favorite")}</Button><Button variant="outline" className="outline-button" disabled={!chart} onClick={()=>setFull(true)}><Maximize2/><T text="Full chart"/></Button><Button className="primary-button" onClick={()=>void openAdd()}><Plus/>{t("Add to watchlist")}</Button></div></div>{data&&<div className="detail-prices"><div><div className="detail-price"><strong>{formatQuote(data.quote.price)}</strong>{change!==null&&change!==undefined&&<span className={direction}><ChangeIcon size={21}/>{dollar!=null&&Number.isFinite(dollar)?`${dollar>=0?'+':''}${dollar.toFixed(2)} `:''}({change>=0?'+':''}{change.toFixed(2)}%)</span>}</div><p>{t('Daily change versus previous close')} · {data.quote.quoteTime?quoteTime(data.quote.quoteTime):t('Time unavailable')}</p></div>{fund?.postMarketPrice!==undefined&&<div className="postmarket"><strong>{formatQuote(fund.postMarketPrice)}</strong><p><Moon size={13}/>{t('After hours')} · {fund.postMarketTime?quoteTime(fund.postMarketTime):t('Time unavailable')}</p></div>}</div>}</div>
  <DailyMove symbol={symbol} chart={overview||chart} earningsDate={fund?.earningsDate}/>
  {error&&<div className="error-banner" role="alert">{error}<Button variant="ghost" onClick={()=>setVersion(v=>v+1)}>Retry</Button></div>}
  <div className={'stock-happening'+(rail?'':' is-collapsed')}>
    <div className="stock-happening-main">
      <section className="main-chart-panel story-card">
        <div className="chart-toolbar">{styleControls}{rangeControls}<Button variant="ghost" size="icon" aria-label="Refresh stock chart" disabled={busy} onClick={()=>setVersion(v=>v+1)}><RefreshCw className={busy?'spin':''}/></Button></div>
        <div className="chart-stage" aria-busy={busy}>{chart&&chart.range===range?<PriceChart data={chart} style={chartStyle} eventDates={chartEvents}/>:<div className="chart-empty"><LoaderCircle className="spin"/>{t("Loading chart…")}</div>}</div>
        <div className="chart-caption"><span>{range==='1d'?`Latest session: ${chart?.sessionDate||'—'}`:t('Historical price · Split-adjusted close')}</span><span>{chart?.timezone}</span></div>
      </section>
      <EarningsStory symbol={symbol} nextDate={fund?.earningsDate}/>
      <section className="story-card company-story">
        <p className="eyebrow"><T text="COMPANY"/></p>
        <h2>{data?.companyName||symbol}</h2>
        <p>{fund?.description||t('A company description is not currently available.')}</p>
        <dl className="company-facts">{[[t("Sector"),fund?.sector],[t("Industry"),fund?.industry],[t("Employees"),fund?.employees===undefined?undefined:num(fund.employees)],[t("Country"),fund?.country]].map(([label,value])=><div key={String(label)}><dt>{label}</dt><dd>{value||'—'}</dd></div>)}</dl>
        {fund?.website&&/^https?:\/\//.test(fund.website)&&<a href={fund.website} target="_blank" rel="noreferrer">{t("Company website ↗")}</a>}
      </section>
    </div>
    <StockFactsRail open={rail} onToggle={()=>setRail(v=>!v)} facts={facts} groups={factGroups} note={fund?.available?t('Company fundamentals. Reporting periods vary.')+' “—” '+t('means unavailable.'):t('Some company statistics are unavailable from the provider.')}/>
  </div><footer className="workspace-footer"><span>Yahoo Finance · Quotes may be delayed · Refreshes every 60 seconds</span><span>Current price vs previous close; watchlist returns use your price at add.</span></footer></main><PublicFooter/>
  <Dialog open={full} onOpenChange={setFull}><DialogContent className="full-chart-dialog"><DialogTitle>{symbol} — Price chart</DialogTitle><DialogDescription>{chart?.sessionDate} · {data?.currency} · {chart?.timezone}</DialogDescription>{styleControls}{rangeControls}{chart&&chart.range===range?<PriceChart data={chart} style={chartStyle} eventDates={chartEvents}/>:<p>Loading chart…</p>}</DialogContent></Dialog>
  <Dialog open={adding} onOpenChange={v=>{if(!saving)setAdding(v);}}><DialogContent className="list-dialog stock-add-dialog"><DialogTitle>{t('Add to watchlist')}</DialogTitle><DialogDescription>{t('Track the latest quote, or optionally add shares and cost. Quantity and purchase details stay fixed after saving.')}</DialogDescription>{account&&<form onSubmit={e=>{e.preventDefault();void add();}}><label className="watchlist-select-label">{t('Watchlist')}</label><Select value={listId} onValueChange={v=>setListId(String(v))}><SelectTrigger className="stock-list-select" aria-label={t('Watchlist')}><SelectValue>{account.watchlists.find(l=>l.id===listId)?.name}</SelectValue></SelectTrigger><SelectContent>{account.watchlists.map(l=><SelectItem key={l.id} value={l.id}>{l.name} ({l.stocks.length}/{account.plan.maxStocks})</SelectItem>)}</SelectContent></Select>{account.watchlists.find(l=>l.id===listId)?.stocks[0]?.currency&&<p className="field-note">{t('This list is')} {account.watchlists.find(l=>l.id===listId)?.stocks[0]?.currency} {t('only. Add a matching quote, or start a new list.')}</p>}<PositionFields value={position} onChange={setPosition} currency={account.watchlists.find(l=>l.id===listId)?.stocks[0]?.currency||data?.currency||'USD'}/><Button type="submit" className="primary-button" disabled={saving||!listId}>{saving?<LoaderCircle className="spin"/>:<Plus/>}{t('Add to watchlist')}</Button></form>}{addError&&(parseCurrencyMismatch(addError)?<MarketLockBanner message={addError}/>:<p className="form-error" role="alert">{addError}</p>)}{saved&&<p className="share-notice" role="status">{saved} <a href="/watchlists">{t('Open watchlists')} →</a></p>}</DialogContent></Dialog>
  <Dialog open={favoritePrompt} onOpenChange={setFavoritePrompt}><DialogContent className="list-dialog"><DialogTitle>{t('Favorites need an account')}</DialogTitle><DialogDescription>{t('Favorites pin names on Markets. They are not a watchlist and do not record a starting price. You can keep browsing without signing in.')}</DialogDescription><div className="add-stock-actions"><Button variant="outline" className="outline-button" onClick={()=>setFavoritePrompt(false)}>{t('Continue browsing')}</Button><a className="solid-link" href={'/login?next='+encodeURIComponent('/stocks/'+encodeURIComponent(symbol)+'?from='+encodeURIComponent(backHref))}>{t('Sign in')}</a></div></DialogContent></Dialog></>;
}
