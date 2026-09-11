'use client';
import {T} from '@/components/product/language';
import {use,useEffect,useState} from 'react';
import {Eye,LockKeyhole,RefreshCw} from 'lucide-react';
import {PublicNav,PublicFooter} from '@/components/product/nav';
import {PerformanceButton} from '@/components/product/performance-button';
import {Portfolio} from '@/components/product/portfolio';
import {WatchlistSummary} from '@/components/product/watchlist-summary';
import {StocksTable} from '@/components/product/stocks-table';
import {type Watchlist} from '@/lib/watchlist';
import {Button} from '@/components/ui/button';
function createdLabel(value?:string){
  const at=Date.parse(value||'');
  return Number.isFinite(at)?new Date(at).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):null;
}
export default function Share({params}:{params:Promise<{token:string}>}){
  const {token}=use(params);
  const [list,setList]=useState<Watchlist|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>{let alive=true;let running=false;async function load(){if(running)return;running=true;setBusy(true);try{const response=await fetch('/api/share/'+encodeURIComponent(token),{cache:'no-store'});const result=await response.json() as Watchlist&{error?:string};if(!response.ok){if(response.status===404&&alive)setList(null);throw new Error(result.error||'Could not load this watchlist.');}if(alive){setList(result);setError('');}}catch(e){if(alive)setError((e as Error).message);}finally{running=false;if(alive)setBusy(false);}}void load();const refresh=()=>{if(!document.hidden)void load();};const timer=setInterval(refresh,60000);document.addEventListener('visibilitychange',refresh);document.addEventListener('watchlist-shared-refresh',refresh);return()=>{alive=false;clearInterval(timer);document.removeEventListener('visibilitychange',refresh);document.removeEventListener('watchlist-shared-refresh',refresh);};},[token]);
  const created=createdLabel(list?.createdAt);
  return <><PublicNav/><main className="workspace shared-workspace"><div className="page-heading"><div><p className="eyebrow">A WATCHLIST SHARED WITH YOU</p><h1>{list?.name||'Shared watchlist'}</h1><p className="intro"><LockKeyhole size={14}/> Read-only · The owner controls this watchlist{created?` · Created ${created}`:''}</p></div></div>{error&&<p className="error-banner" role="alert">{error}</p>}{list?<section className="watch-card"><div className="card-heading"><span className="refresh-state"><Eye size={16}/>{list.stocks.length} stocks · Refreshes every 60 seconds</span><PerformanceButton list={list} version={JSON.stringify(list.stocks)} shareToken={token}/><Button variant="outline" disabled={busy} onClick={()=>document.dispatchEvent(new Event('watchlist-shared-refresh'))}><RefreshCw className={busy?'spin':''}/><T text="Refresh"/></Button></div>
    {list.stocks.length?<><WatchlistSummary list={list}/><div className="watchlist-analytics-layout"><div className="watchlist-table-pane"><StocksTable stocks={list.stocks} advanced={list.mode==='advanced'}/></div><aside className="watchlist-chart-pane"><Portfolio list={list} version={JSON.stringify(list.stocks)} shareToken={token}/></aside></div></>:<div className="shared-empty">This watchlist doesn’t have any stocks yet. Check back for the owner’s next idea.</div>}
  </section>:!error&&<p role="status">Opening the shared watchlist…</p>}<footer className="workspace-footer"><span>Yahoo Finance · Quotes may be delayed</span><span>Changes are measured from the original price at add.</span></footer></main><PublicFooter/></>;
}
