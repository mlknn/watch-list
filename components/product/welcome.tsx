'use client';
import {T,useT} from '@/components/product/language';
import {Bookmark,ChartLine,CirclePlus} from 'lucide-react';
import {useEffect,useState} from 'react';
import {ExampleWatchlistPreview,SamplePortfolio,useShowcase} from '@/components/product/showcase';
import {HomeDiscovery} from '@/components/product/home-tools';
import {WatchlistWorkspace} from '@/components/product/watchlist-workspace';
import {PublicNav,PublicFooter} from '@/components/product/nav';
import {readGuestState} from '@/lib/guest-watchlist.mjs';

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

export function Welcome(){
  const t=useT();
  const showcase=useShowcase();
  const [returning,setReturning]=useState(false);
  const [guest,setGuest]=useState(true);

  useEffect(()=>{
    setReturning(guestHasStocks());
    const onReady=(event:Event)=>{
      const detail=(event as CustomEvent<{hasStocks?:boolean;guest?:boolean}>).detail;
      if(typeof detail?.hasStocks==='boolean')setReturning(detail.hasStocks);
      if(typeof detail?.guest==='boolean')setGuest(detail.guest);
    };
    window.addEventListener('watchlist:ready',onReady);
    return()=>window.removeEventListener('watchlist:ready',onReady);
  },[]);

  return <><PublicNav/><main className={'welcome'+(returning?' is-returning':'')}>
    <section className="home-hero">
      <div className="hero-copy">
        <p className="eyebrow">{t('WATCHLISTS · MARKETS · EARNINGS')}</p>
        {returning?<>
          <h1><T text="Your watchlist is ready."/></h1>
          <p><T text="Continue from the prices you already recorded, or add another company."/></p>
          <div className="hero-actions">
            <a className="solid-link" href="/watchlists"><T text="Continue to your watchlists"/></a>
            <a className="outline-link" href="/dashboard"><T text="Explore markets"/></a>
          </div>
        </>:<>
          <h1><T text="Track your stock ideas from the day you add them."/></h1>
          <p><T text="Save the stocks you want to follow, see how their prices change from your starting point, and keep markets and earnings within reach."/></p>
          <div className="hero-actions">
            <button type="button" className="primary-button" onClick={startWatchlist}><T text="Start your watchlist"/></button>
            <a className="outline-link" href="/dashboard"><T text="Explore markets"/></a>
          </div>
          <p className="hero-note"><T text="No account needed to start. Your guest watchlist stays on this device."/></p>
        </>}
      </div>
      {!returning&&<ExampleWatchlistPreview data={showcase.data} error={showcase.error} onRetry={showcase.retry}/>}
    </section>

    <WatchlistWorkspace compact/>
    <HomeDiscovery/>

    {!returning&&<section className="home-steps" aria-label={t('How it works')}>
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

    <details className="home-example">
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
  </main><PublicFooter/></>;
}
