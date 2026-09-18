'use client';
import {T,useT} from '@/components/product/language';
import {LogoMark} from '@/components/product/logo';
import {Showcase} from '@/components/product/showcase';
import { ArrowUpRight, Check, Eye, Link2, TrendingUp } from 'lucide-react';
import {Community} from '@/components/product/community';
import { PublicNav, PublicFooter } from '@/components/product/nav';
function ProductWays(){
  const t=useT();
  return <section className="market-goals welcome-goals" aria-label={t('What you can do here')}>
    <p className="eyebrow"><T text="THREE WAYS TO USE IT"/></p>
    <h2><T text="Watchlists, markets, and earnings."/></h2>
    <p className="intro"><T text="StockWatchlist is three tools. Pick the one you need, or use all of them."/></p>
    <div className="market-goal-grid">
      <article>
        <p className="eyebrow"><T text="1 · WHAT-IF"/></p>
        <h3><T text="Build a portfolio"/></h3>
        <p><T text="Add stocks, freeze the price from the day you add them, and see what happens after that."/></p>
        <a className="primary-button" href="/watchlists"><T text="Open watchlists"/></a>
      </article>
      <article>
        <p className="eyebrow"><T text="2 · MARKETS"/></p>
        <h3><T text="Follow the tape"/></h3>
        <p><T text="Indexes, sectors, ETFs, and a market switcher for the US, Europe, Canada, and Turkey."/></p>
        <a className="outline-button" href="/dashboard#todays-tape"><T text="See today’s markets"/></a>
      </article>
      <article>
        <p className="eyebrow"><T text="3 · EARNINGS"/></p>
        <h3><T text="US earnings calendar"/></h3>
        <p><T text="See who reports next Monday, Wednesday, and the rest of the week — and who already reported in the last two quarters."/></p>
        <a className="outline-button" href="/earnings"><T text="Open the calendar"/></a>
      </article>
    </div>
  </section>;
}
export function Welcome() {
  const t=useT();
  const steps=[{n:'01',title:t('Name a portfolio'),text:t('Call it whatever you are testing — 2027 AI Picks, a sector bet, a what-if with $10,000.'),icon:Eye},{n:'02',title:t('Add stocks and amounts'),text:t('Pick tickers, then enter shares, cost, and a purchase date. We lock that starting point.'),icon:TrendingUp},{n:'03',title:t('Save when it is worth keeping'),text:t('See the portfolio right away. Create an account only if you want it back on another device.'),icon:Link2}];
  return <><PublicNav/><main className="welcome"><section className="welcome-hero"><div className="hero-copy"><span className="eyebrow"><T text="WHAT IF"/></span><div className="hero-brand-mark"><LogoMark/><span>StockWatchlist.app</span></div><h1><T text="What if you invested $10,000 in your stock picks today?"/></h1><p><T text="Build a portfolio. Pick your stocks. Set your starting amounts. We’ll remember the starting point and track what happens."/></p><div className="hero-actions"><a className="solid-link" href="/watchlists"><T text="Build a portfolio — no signup"/><ArrowUpRight size={18}/></a><a className="outline-link" href="/dashboard"><T text="See today’s markets"/><ArrowUpRight size={18}/></a></div><span className="hero-note"><Check size={14}/><T text="No account needed to start · "/><a href="/privacy"><T text="Privacy"/></a></span></div><Showcase/></section><ProductWays/><section id="about" className="purpose-section"><div><p className="eyebrow"><T text="WHAT THIS APP IS"/></p><h2><T text="A what-if portfolio, not another watchlist."/></h2><p><T text="Yahoo, Robinhood, and the rest show today’s price. This shows what happened after you put a number on an idea. Name a portfolio, add tickers, enter shares and cost, and we freeze that starting point. Sign in only when you want to keep it — not before you’ve built anything. Market data is delayed public quotes, not advice."/></p></div><ul className="purpose-points"><li><strong><T text="Build first. Save later."/></strong> <T text="The portfolio lives on this device until you choose to create a free account."/></li><li><strong><T text="Starting amounts stay fixed."/></strong> <T text="Later quotes do not rewrite the price or cost from the day you added a stock."/></li><li><strong><T text="See the finished picture immediately."/></strong> <T text="Cost, value, and change show up as soon as you add holdings."/></li><li><strong><T text="US, Europe, Canada, and Turkey."/></strong> <T text="Each list stays in the currency of the first stock you add — USD, EUR, CAD, or TRY."/></li><li><strong><T text="Optional Google Sign-In."/></strong> <T text="We use your Google name and email only to save the account. We do not read Gmail, Drive, or contacts. "/><a href="/privacy"><T text="How we use Google account data"/></a></li><li><strong><T text="Open source (MIT)."/></strong> <T text="Read the code, self-host it, or follow the public repo."/> <a href="/open-source"><T text="Open source"/></a> · <a href="https://github.com/mlknn/watch-list" rel="noopener noreferrer"><T text="GitHub"/></a></li></ul></section><section id="how-it-works" className="how-section"><div><p className="eyebrow"><T text={'FROM “WHAT IF” TO “LOOK AT THAT”'}/></p><h2><T text="Less noise. More perspective."/></h2></div><div className="feature-grid">{steps.map(f=><article key={f.n}><div className="feature-top"><span>{f.n}</span><f.icon size={23}/></div><h3>{f.title}</h3><p>{f.text}</p></article>)}</div></section><Community/><section className="join-banner"><div><p className="eyebrow"><T text="MAKE ROOM FOR YOUR NEXT IDEA"/></p><h2><T text="Start with one portfolio. See where it leads."/></h2><p><T text="No signup to build · 5 watchlists · 20 stocks each · Save with a free account when you are ready"/></p></div><a className="solid-link" href="/watchlists"><T text="Build a portfolio — no signup"/><ArrowUpRight size={18}/></a></section></main><PublicFooter/></>;
}
