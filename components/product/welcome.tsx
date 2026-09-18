'use client';
import {T,useT} from '@/components/product/language';
import {SamplePortfolio,useShowcase} from '@/components/product/showcase';
import {HomeTools} from '@/components/product/home-tools';
import {ArrowUpRight,Check,Eye,Link2,TrendingUp} from 'lucide-react';
import {Community} from '@/components/product/community';
import {PublicNav,PublicFooter} from '@/components/product/nav';

export function Welcome() {
  const t=useT();
  const showcase=useShowcase();
  const steps=[
    {n:'01',title:t('Name a watchlist'),text:t('Call it whatever you are testing — 2027 AI Picks, a sector bet, a what-if with $10,000.'),icon:Eye},
    {n:'02',title:t('Add stocks and amounts'),text:t('Pick tickers, then enter shares, cost, and a purchase date. We lock that starting point.'),icon:TrendingUp},
    {n:'03',title:t('Save when it is worth keeping'),text:t('See the portfolio right away. Create an account only if you want it back on another device.'),icon:Link2},
  ];
  return <><PublicNav/>
  <main className="welcome">
    <section className="home-hero">
      <h1><T text="Your stocks. The markets. What’s next."/></h1>
      <p><T text="Track your stock ideas, explore global markets, and see who reports earnings next."/></p>
      <span className="hero-note"><Check size={14}/><T text="No account needed to start · "/><a href="/privacy"><T text="Privacy"/></a></span>
    </section>
    <HomeTools showcase={showcase.data}/>
    <SamplePortfolio data={showcase.data} error={showcase.error}/>
    <section id="about" className="purpose-section">
      <div>
        <p className="eyebrow"><T text="WHAT THIS APP IS"/></p>
        <h2><T text="Three tools, one place."/></h2>
        <p><T text="Watchlists keep the price from the day you add a stock, markets show today’s tape, and the calendar shows who reports next. Market data is delayed public quotes, not advice."/></p>
      </div>
      <ul className="purpose-points">
        <li><strong><T text="Build first. Save later."/></strong> <T text="The portfolio lives on this device until you choose to create a free account."/></li>
        <li><strong><T text="Starting amounts stay fixed."/></strong> <T text="Later quotes do not rewrite the price or cost from the day you added a stock."/></li>
        <li><strong><T text="See the finished picture immediately."/></strong> <T text="Cost, value, and change show up as soon as you add holdings."/></li>
        <li><strong><T text="US, Europe, Canada, and Turkey."/></strong> <T text="Each list stays in the currency of the first stock you add — USD, EUR, CAD, or TRY."/></li>
        <li><strong><T text="Optional Google Sign-In."/></strong> <T text="We use your Google name and email only to save the account. We do not read Gmail, Drive, or contacts. "/><a href="/privacy"><T text="How we use Google account data"/></a></li>
        <li><strong><T text="Open source (MIT)."/></strong> <T text="Read the code, self-host it, or follow the public repo."/> <a href="/open-source"><T text="Open source"/></a> · <a href="https://github.com/mlknn/watch-list" rel="noopener noreferrer"><T text="GitHub"/></a></li>
      </ul>
      <Community/>
    </section>
    <section id="how-it-works" className="how-section">
      <div>
        <p className="eyebrow"><T text={'FROM “WHAT IF” TO “LOOK AT THAT”'}/></p>
        <h2><T text="Less noise. More perspective."/></h2>
      </div>
      <div className="feature-grid">{steps.map(f=><article key={f.n}><div className="feature-top"><span>{f.n}</span><f.icon size={23}/></div><h3>{f.title}</h3><p>{f.text}</p></article>)}</div>
    </section>
    <section className="join-banner">
      <div>
        <p className="eyebrow"><T text="MAKE ROOM FOR YOUR NEXT IDEA"/></p>
        <h2><T text="Start with one watchlist. See where it leads."/></h2>
        <p><T text="No signup to build · 5 watchlists · 20 stocks each · Save with a free account when you are ready"/></p>
      </div>
      <a className="solid-link" href="/watchlists"><T text="Build a watchlist"/><ArrowUpRight size={18}/></a>
    </section>
  </main>
  <PublicFooter/></>;
}
