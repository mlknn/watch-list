'use client';
import {T,useT} from '@/components/product/language';
import {useEffect,useRef,useState} from 'react';
import {Eye,LockKeyhole,RefreshCw} from 'lucide-react';
import {PublicNav,PublicFooter} from '@/components/product/nav';
import {PerformanceButton} from '@/components/product/performance-button';
import {Portfolio} from '@/components/product/portfolio';
import {WatchlistBoard} from '@/components/product/watchlist-summary';
import {StocksTable} from '@/components/product/stocks-table';
import {type Watchlist} from '@/lib/watchlist';
import {Button} from '@/components/ui/button';

function createdLabel(value?:string){
  const at=Date.parse(value||'');
  return Number.isFinite(at)?new Date(at).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):null;
}

export function SharedWatchlist({token}:{token:string}){
  const t=useT();
  const [list,setList]=useState<Watchlist|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[unavailable,setUnavailable]=useState(false),[stale,setStale]=useState(false);
  const listRef=useRef<Watchlist|null>(null);
  useEffect(()=>{
    let alive=true;let running=false;
    async function load(){
      if(running)return;running=true;setBusy(true);
      try{
        const response=await fetch('/api/share/'+encodeURIComponent(token),{cache:'no-store'});
        const result=await response.json() as Watchlist&{error?:string};
        if(!response.ok){
          if(response.status===404){
            if(alive){setUnavailable(true);setList(null);}
            throw new Error(result.error||t('This link is unavailable or has been turned off.'));
          }
          throw new Error(result.error||t('Could not load this watchlist.'));
        }
        if(alive){listRef.current=result;setList(result);setError('');setUnavailable(false);setStale(false);}
      }catch(e){
        if(alive){setError((e as Error).message);if(listRef.current)setStale(true);}
      }finally{running=false;if(alive)setBusy(false);}
    }
    void load();
    const refresh=()=>{if(!document.hidden)void load();};
    const timer=setInterval(refresh,60000);
    document.addEventListener('visibilitychange',refresh);
    document.addEventListener('watchlist-shared-refresh',refresh);
    return()=>{alive=false;clearInterval(timer);document.removeEventListener('visibilitychange',refresh);document.removeEventListener('watchlist-shared-refresh',refresh);};
  },[token,t]);
  const created=createdLabel(list?.createdAt);
  return <><PublicNav/><main className="workspace shared-workspace">
    <div className="page-heading">
      <div>
        <p className="eyebrow">{t("A WATCHLIST SHARED WITH YOU")}</p>
        <h1>{list?.name||t("Shared watchlist")}</h1>
        <p className="intro"><LockKeyhole size={14}/> {t("Read-only · The owner controls this watchlist")}{created?` · ${created}`:''}</p>
      </div>
    </div>
    {error&&<p className="error-banner" role="alert">{error}{!unavailable&&<Button variant="ghost" onClick={()=>document.dispatchEvent(new Event('watchlist-shared-refresh'))}>{t('Retry')}</Button>}</p>}
    {unavailable&&<p><a className="solid-link" href="/">{t('Go home')}</a> · <a className="outline-link" href="/dashboard">{t('Browse markets')}</a></p>}
    {stale&&list&&<p className="quote-warning" role="status">{t('Showing last loaded values after a refresh failed.')}</p>}
    {list?<section className="watch-card">
      <div className="card-heading">
        <span className="refresh-state"><Eye size={16}/>{list.stocks.length} {t('stocks')} · {t('Refreshes every 60s')}</span>
        <PerformanceButton list={list} version={JSON.stringify(list.stocks)} shareToken={token}/>
        <Button variant="outline" disabled={busy} onClick={()=>document.dispatchEvent(new Event('watchlist-shared-refresh'))}><RefreshCw className={busy?'spin':''}/><T text="Refresh"/></Button>
      </div>
      {list.stocks.length?<><WatchlistBoard list={list}/><div className="watchlist-analytics-layout"><div className="watchlist-table-pane"><StocksTable stocks={list.stocks} advanced={list.mode==='advanced'}/></div><aside className="watchlist-chart-pane"><Portfolio list={list} version={JSON.stringify(list.stocks)} shareToken={token}/></aside></div></>:<div className="shared-empty">{t('This watchlist doesn’t have any stocks yet. Check back for the owner’s next idea.')}</div>}
    </section>: !error&&<p role="status">{t("Opening the shared watchlist…")}</p>}
    <footer className="workspace-footer"><span>{t('Yahoo Finance · Quotes may be delayed')}</span><span>{t('Change since added uses the recorded starting price.')}</span></footer>
  </main><PublicFooter/></>;
}
