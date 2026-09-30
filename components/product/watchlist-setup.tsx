'use client';
import {Check,Search,Pencil,CloudUpload} from 'lucide-react';
import {useT} from './language';
import type {Watchlist} from '@/lib/watchlist';

export function WatchlistSetup({list,busy,onSearch,onRename,onSave}:{list:Watchlist;busy:boolean;onSearch:()=>void;onRename:()=>void;onSave:()=>void}){
  const t=useT();
  const added=list.stocks.length>0;
  const named=!!list.name.trim()&&list.name!=='My watchlist';
  const completed=Number(added)+Number(named);
  return <section className="watchlist-setup" aria-label={t('Set up your watchlist')}>
    <header><div><h3>{t('Set up your watchlist')}</h3><p>{t('Start here, then keep your ideas across devices.')}</p></div><span aria-label={t('Setup progress')}>{completed}/3</span></header>
    <ol>
      <li className={added?'is-complete':undefined}><button type="button" disabled={busy} onClick={onSearch}>{added?<Check aria-hidden="true"/>:<Search aria-hidden="true"/>}<span><strong>{added?t('First stock added'):t('Add your first stock')}</strong><small>{added?t('Add another company anytime.'):t('Search by company name or ticker.')}</small></span></button></li>
      <li className={named?'is-complete':undefined}><button type="button" disabled={busy} onClick={onRename}>{named?<Check aria-hidden="true"/>:<Pencil aria-hidden="true"/>}<span><strong>{named?t('Watchlist named'):t('Name your watchlist')}</strong><small>{named?list.name:t('Give your ideas a name you recognize.')}</small></span></button></li>
      <li><button type="button" disabled={busy} onClick={onSave}><CloudUpload aria-hidden="true"/><span><strong>{t('Save with a free account')}</strong><small>{t('Keep your stocks and starting prices on any device.')}</small></span></button></li>
    </ol>
  </section>;
}
