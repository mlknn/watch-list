'use client';
import {T} from '@/components/product/language';
import {CalendarDays,Eye,Globe} from 'lucide-react';
import {SamplePortfolio,useShowcase} from '@/components/product/showcase';
import {HomeTools} from '@/components/product/home-tools';
import {WatchlistWorkspace} from '@/components/product/watchlist-workspace';
import {PublicNav,PublicFooter} from '@/components/product/nav';

export function Welcome() {
  const showcase=useShowcase();
  return <><PublicNav/><main className="welcome">
    <section className="home-hero">
      <h1><T text="Keep an eye on what matters."/></h1>
      <p><T text="Your watchlist, market moves, and earnings — together."/></p>
      <div className="home-hero-points">
        <a href="/watchlists"><Eye size={18} aria-hidden="true"/><span><strong><T text="Watchlists"/></strong><span><T text="Organize your ideas"/></span></span></a>
        <a href="/dashboard"><Globe size={18} aria-hidden="true"/><span><strong><T text="Markets"/></strong><span><T text="Track global markets"/></span></span></a>
        <a href="/earnings"><CalendarDays size={18} aria-hidden="true"/><span><strong><T text="Earnings"/></strong><span><T text="See who is reporting"/></span></span></a>
      </div>
    </section>
    <HomeTools showcase={showcase.data}/>
    <WatchlistWorkspace compact/>
    <details className="home-example" open><summary><T text="See an example watchlist"/></summary><SamplePortfolio data={showcase.data} error={showcase.error}/></details>
    <section id="about" className="home-about">
      <h2><T text="Three tools, one place."/></h2>
      <p><T text="Start with one watchlist on this device. Create a free account for up to five lists and access across devices."/></p>
      <p><T text="Yahoo Finance · Quotes may be delayed"/> · <a href="/privacy"><T text="Privacy"/></a> · <a href="/open-source"><T text="Open source"/></a></p>
    </section>
  </main><PublicFooter/></>;
}
