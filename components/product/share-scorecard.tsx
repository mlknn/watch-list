'use client';
import {useT} from '@/components/product/language';
import {T} from '@/components/product/language';
import {shareCard} from '@/lib/share-card.mjs';
import {type Watchlist} from '@/lib/watchlist';

export function ShareScorecard({list,compact=false}:{list:Watchlist;compact?:boolean}){
  const t=useT();
  const card=shareCard(list);
  return <aside className={'share-scorecard'+(compact?' is-compact':'')+(card.tone==='up'?' is-up':card.tone==='down'?' is-down':'')} aria-label={card.title}>
    {compact&&<p className="share-scorecard-kicker"><T text="What friends will see"/></p>}
    <strong className="share-scorecard-name">{card.name}</strong>
    <p className="share-scorecard-return">{card.returnLabel||'—'}</p>
    <p className="share-scorecard-note">{card.returnLabel?t('since tracking started'):card.count?`${card.count} ${t('Stocks')}`:t('No stocks yet')}</p>
    {!!card.tickers&&<p className="share-scorecard-tickers">{card.tickers}</p>}
  </aside>;
}
