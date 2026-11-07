'use client';
import {T,useT} from '@/components/product/language';
import {Bookmark,ChartLine,CirclePlus,ArrowDownRight,ArrowUpRight,ShieldCheck,ScanSearch,RefreshCw,LoaderCircle} from 'lucide-react';
import {useCallback,useEffect,useRef,useState} from 'react';
import {ExampleWatchlistPreview,SamplePortfolio,useShowcase} from '@/components/product/showcase';
import {HomeDiscovery} from '@/components/product/home-tools';
import {WatchlistWorkspace} from '@/components/product/watchlist-workspace';
import {PublicNav,PublicFooter} from '@/components/product/nav';
import {readGuestState} from '@/lib/guest-watchlist.mjs';
import {type AccountState,watchlistDayChange,watchlistPerformance,watchlistRefreshTime} from '@/lib/watchlist';
import {apiJson} from '@/lib/auth-client';
import {marketChart,type MarketChart} from '@/lib/market';
import {stockHref} from '@/lib/safe-return.mjs';

function guestHasStocks(){
  if(typeof window==='undefined')return false;
  try{return readGuestState(window.localStorage).watchlists.some(list=>list.stocks.length>0);}
  catch{return false;}
}

function startWatchlist(){
  const section=document.getElementById('your-watchlist');
  const input=document.getElementById('watchlist-search') as HTMLInputElement|null;
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  section?.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'});
  window.setTimeout(()=>input?.focus({preventScroll:true}),reduce?0:280);
}

const majorMarkets=[{symbol:'^GSPC',name:'S&P 500'},{symbol:'^IXIC',name:'Nasdaq'},{symbol:'^DJI',name:'Dow Jones'}];
function MajorMarketStatus(){
  const [rows,setRows]=useState<{symbol:string;name:string;chart:MarketChart|null}[]>(()=>majorMarkets.map(row=>({...row,chart:null})));
  useEffect(()=>{
    let alive=true;
    void Promise.all(majorMarkets.map(async row=>({ ...row,chart:await marketChart(row.symbol,'1d').catch(()=>null) }))).then(result=>{if(alive)setRows(result);});
    return()=>{alive=false;};
  },[]);
  return <section className="member-market-status" aria-label="Major market status">
    {rows.map(row=>{const change=row.chart?.quote.changePercent;const tone=change==null?'':change>0?'up':change<0?'down':'flat';return <div className="member-market-status-item" key={row.symbol}><span>{row.name}</span><strong className={tone}>{change==null?'—':`${change>0?'+':''}${change.toFixed(2)}%`}</strong><small>{row.chart?.quote.change==null?'Market quote':`${row.chart.quote.change>0?'+':''}${row.chart.quote.change.toFixed(2)} pts`}</small></div>;})}
  </section>;
}

export function Welcome(){
  const t=useT();
  const showcase=useShowcase();
  const [returning,setReturning]=useState(false);
  const [guest,setGuest]=useState(true);
  const [account,setAccount]=useState<AccountState|null>(null);
  const accountRef=useRef(account);
  accountRef.current=account;
  const [now,setNow]=useState(Date.now());
  const refreshing=useRef(false);
  const [refreshingNow,setRefreshingNow]=useState(false);
  const [refreshMessage,setRefreshMessage]=useState('');
  const [refreshProgress,setRefreshProgress]=useState('');
  const member=!!account&&!account.guest;

  useEffect(()=>{
    setReturning(guestHasStocks());
    const onReady=(event:Event)=>{
      const detail=(event as CustomEvent<{hasStocks?:boolean;guest?:boolean;state?:AccountState}>).detail;
      if(typeof detail?.hasStocks==='boolean')setReturning(detail.hasStocks);
      if(typeof detail?.guest==='boolean')setGuest(detail.guest);
      if(detail?.state)setAccount(detail.state);
    };
    window.addEventListener('watchlist:ready',onReady);
    return()=>window.removeEventListener('watchlist:ready',onReady);
  },[]);

  const refreshAllQuotes=useCallback(async()=>{
    if(!member||document.hidden||refreshing.current)return;
    refreshing.current=true;setRefreshingNow(true);setRefreshMessage('');
    try{
      let latest=accountRef.current;
      let failed=0;
      const lists=latest?.watchlists||[];
      for(let index=0;index<lists.length;index++){
        const list=lists[index];
        setRefreshProgress(`${index+1}/${lists.length}`);
        try{
          const fresh=await apiJson<AccountState>(`/api/watchlists?watchlistId=${encodeURIComponent(list.id)}&refresh=1&force=1`);
          const updated=fresh.watchlists.find(item=>item.id===list.id);
          if(updated&&latest){latest={...fresh,watchlists:latest.watchlists.map(item=>item.id===updated.id?updated:item)};accountRef.current=latest;setAccount(latest);setReturning(latest.watchlists.some(item=>item.stocks.length>0));setNow(Date.now());}
        }catch{failed++;}
      }
      const errors=latest?.watchlists.flatMap(list=>list.stocks).filter(stock=>!!stock.quoteError).length||0;
      setRefreshMessage(failed?`${failed} ${failed===1?'watchlist could':'watchlists could'} not refresh.`:errors?`${errors} ${errors===1?'price needs':'prices need'} attention.`:'');
    }catch(e){setRefreshMessage((e as Error).message||'Could not refresh quotes.');}
    finally{refreshing.current=false;setRefreshingNow(false);setRefreshProgress('');setNow(Date.now());}
  },[member]);

  useEffect(()=>{
    if(!member)return;
    void refreshAllQuotes();
    const timer=window.setInterval(()=>void refreshAllQuotes(),60_000);
    const clock=window.setInterval(()=>setNow(Date.now()),15_000);
    const onVisibility=()=>{if(!document.hidden)void refreshAllQuotes();};
    document.addEventListener('visibilitychange',onVisibility);
    return()=>{window.clearInterval(timer);window.clearInterval(clock);document.removeEventListener('visibilitychange',onVisibility);};
  },[member,refreshAllQuotes]);

  const allStocks=account?.watchlists.flatMap(list=>list.stocks)||[];
  const refreshIssues=allStocks.filter(stock=>!!stock.quoteError).length;
  const overallRefresh=watchlistRefreshTime({stocks:allStocks},now);
  return <><PublicNav/><main className={'welcome'+(returning?' is-returning':'')+(member?' is-member-home':'')}>
    {member?<>
      <section className="member-home-hero">
        <div className="member-home-heading"><p className="eyebrow"><span className="hero-kicker-dot"/> {t('YOUR INVESTING SPACE')}</p><h1>{account.user.name?`${t('Welcome back')}, ${account.user.name.split(' ')[0]}.`:t('Welcome back.')}</h1><p>{t('Here’s how your watchlists are doing. Pick up where you left off or explore what’s moving.')}</p><div className="hero-actions"><a className="solid-link" href="/watchlists">{t('Open your watchlists')}</a><a className="outline-link" href="/dashboard">{t('Explore markets')}</a><a className="outline-link" href="/earnings">{t('Upcoming earnings')}</a></div></div>
        <div className="member-home-stats"><div><span>{t('Watchlists')}</span><strong>{account.watchlists.length}</strong></div><div><span>{t('Stocks you follow')}</span><strong>{allStocks.length}</strong></div><div className="member-quote-status"><span>{t('Overall quote status')}</span><strong role="status" aria-live="polite">{refreshingNow?`${t('Refreshing all quotes…')} ${refreshProgress}`:refreshMessage|| (refreshIssues?`${refreshIssues} ${t('prices need attention')}`:overallRefresh)}</strong><button type="button" className="member-refresh-button" onClick={()=>void refreshAllQuotes()} disabled={refreshingNow}><RefreshCw size={15} className={refreshingNow?'spin':''}/>{refreshingNow?t('Refreshing…'):t('Refresh all quotes')}</button></div></div>
      </section>
      <section className="member-watchlists-section"><div className="member-section-heading"><div><p className="eyebrow">{t('YOUR WATCHLISTS')}</p><h2>{t('Your ideas, at a glance')}</h2></div><a href="/watchlists">{t('Manage watchlists')} <ArrowUpRight size={16}/></a></div>
        <MajorMarketStatus/>
        {account.watchlists.length?<div className="member-watchlist-grid">{account.watchlists.map(list=>{const change=watchlistDayChange(list);const overall=watchlistPerformance(list);const tone=change===null?'unknown':change>0?'up':change<0?'down':'flat';const watchlistHref=`/watchlists?watchlistId=${encodeURIComponent(list.id)}`;return <article className={`member-watchlist-card day-${tone}`} key={list.id}><div className="member-watchlist-card-head"><a className="member-list-icon" href={watchlistHref} aria-label={`${t('View watchlist')}: ${list.name}`}><ChartLine size={18}/></a><span className="member-watchlist-return"><small>{t("Today's performance")}</small><strong>{change===null?'—':`${change>0?'+':''}${change.toFixed(2)}%`}</strong></span></div><h3><a href={watchlistHref}>{list.name}</a></h3><p>{list.stocks.length} {t('Stocks')} · {list.mode==='advanced'?t('Holdings and cost basis'):t('Price change since added')}</p><div className="member-watchlist-overall"><span>{t('Overall performance')}</span><strong className={overall===null?'':overall>0?'up':overall<0?'down':'flat'}>{overall===null?'—':`${overall>0?'+':''}${overall.toFixed(2)}%`}</strong></div><div className="member-ticker-row">{list.stocks.slice(0,5).map(stock=>{const stockTone=stock.dayChangePercent===undefined||stock.dayChangePercent===null?'flat':stock.dayChangePercent>0?'up':stock.dayChangePercent<0?'down':'flat';return <a className={`member-ticker day-${stockTone}`} href={stockHref(stock.symbol,watchlistHref)} key={stock.id}>{stock.symbol}</a>;})}{list.stocks.length>5&&<span>+{list.stocks.length-5}</span>}{!list.stocks.length&&<span>{t('Ready for your next idea')}</span>}</div><div className="member-card-footer"><a className="member-card-link" href={watchlistHref}>{t('View watchlist')} <ArrowUpRight size={15}/></a><small className="member-card-refresh">{watchlistRefreshTime(list,now)}</small></div></article>;})}</div>:<div className="member-empty-card"><ChartLine size={23}/><div><strong>{t('Your first list is ready for an idea.')}</strong><p>{t('Add a company to start tracking its price from the day you choose it.')}</p></div><a className="solid-link" href="/watchlists">{t('Add a stock')}</a></div>}
      </section>
      <HomeDiscovery account={account}/>
      <section className="member-home-footer"><span>{t('Saved to your account')}</span><a href="/account">{t('Account settings')} <ArrowUpRight size={15}/></a></section>
    </>:<>
    <section className="home-hero">
      <div className="hero-copy">
        <p className="eyebrow hero-kicker"><span className="hero-kicker-dot"/> {t('A clearer view of every stock idea')}</p>
        {returning?<>
          <h1><T text="Your watchlist is ready."/></h1>
          <p><T text="Continue from the prices you already recorded, or add another company."/></p>
          <div className="hero-actions">
            <a className="solid-link" href="/watchlists"><T text="Continue to your watchlists"/></a>
            <a className="outline-link" href="/dashboard"><T text="Explore markets"/></a>
            <a className="outline-link" href="/earnings"><T text="View earnings"/></a>
          </div>
        </>:<>
          <h1><T text="Give every stock idea a real starting point."/></h1>
          <p><T text="Track the price from the day you add a company, see what changed over time, and keep market context and earnings close at hand."/></p>
          <div className="hero-actions">
            <button type="button" className="primary-button" onClick={startWatchlist}><T text="Start your watchlist"/></button>
            <a className="outline-link" href="/dashboard"><T text="Explore markets"/></a>
            <a className="outline-link" href="/earnings"><T text="View earnings"/></a>
          </div>
          <p className="hero-note"><ShieldCheck size={15} aria-hidden="true"/><T text="No account needed to start. Your guest watchlist stays on this device."/></p>
        </>}
      </div>
      {!returning&&<div className="hero-showcase"><div className="hero-orbit hero-orbit-one"/><div className="hero-orbit hero-orbit-two"/><div className="hero-visual-label"><span><i/> {t('YOUR IDEAS, IN CONTEXT')}</span><span>{t('Live market quotes')}</span></div><ExampleWatchlistPreview data={showcase.data} error={showcase.error} onRetry={showcase.retry}/><div className="hero-insight"><span className="hero-insight-icon"><ChartLine size={17}/></span><span><strong>{t('A price worth remembering')}</strong><small>{t('Every idea keeps its day-one reference.')}</small></span><span className="hero-insight-arrow"><ArrowUpRight size={17}/></span></div><div className="hero-footnote"><ArrowDownRight size={14}/>{t('Track the journey, not just today’s quote.')}</div></div>}
    </section>

    {!returning&&<section className="welcome-proof"><div><strong>01</strong><span>{t('A saved starting price')}</span></div><div><strong>02</strong><span>{t('Real price changes over time')}</span></div><div><strong>03</strong><span>{t('Markets and earnings together')}</span></div></section>}

    <WatchlistWorkspace compact/>
    <HomeDiscovery/>
    <section className="home-idea-lab"><div><p className="eyebrow">{t('FROM WATCHING TO LEARNING')}</p><h2>{t('More than a list of tickers')}</h2><p>{t('Bring a watchlist from another app, record a decision checkpoint, compare an idea with an ETF, and explore a hypothetical downside.')}</p></div><a className="solid-link" href="/watchlists#idea-lab">{t('Explore the idea lab')}</a></section>

    {!returning&&<section className="home-steps" aria-label={t('How it works')}>
      <div className="home-steps-intro"><p className="eyebrow">{t('FROM IDEA TO INSIGHT')}</p><h2>{t('A simple way to stay close to what matters.')}</h2><p>{t('Your watchlist gives each company a place, a starting point, and a story you can follow.')}</p></div>
      <article>
        <CirclePlus size={20} aria-hidden="true"/>
        <h2><T text="Add a company"/></h2>
        <p><T text="Search for a stock you want to follow."/></p>
      </article>
      <article>
        <Bookmark size={20} aria-hidden="true"/>
        <h2><T text="Keep your starting point"/></h2>
        <p><T text="Your watchlist records a reference price when you add it."/></p>
      </article>
      <article>
        <ChartLine size={20} aria-hidden="true"/>
        <h2><T text="Follow what changes"/></h2>
        <p><T text="Review price changes and explore markets and upcoming earnings."/></p>
      </article>
    </section>}

    <details className="home-example" open>
      <summary><T text="Explore the example watchlist."/></summary>
      <SamplePortfolio data={showcase.data} error={showcase.error}/>
    </details>

    <section className="home-about">
      {guest?<>
        <h2><T text="Stay on this device, or keep lists across devices."/></h2>
        <p><T text="A guest watchlist is stored in this browser. A free account keeps up to five lists of 20 stocks each, on any device."/></p>
        <p><a href="/signup"><T text="Create a free account"/></a> · <a href="/login"><T text="Log in"/></a></p>
      </>:<h2><T text="Your lists are saved to your account."/></h2>}
      <p><T text="Yahoo Finance · Quotes may be delayed"/> · <a href="/privacy"><T text="Privacy"/></a> · <a href="/open-source"><T text="Open source"/></a></p>
    </section>
    </>}
  </main><PublicFooter/></>;
}
