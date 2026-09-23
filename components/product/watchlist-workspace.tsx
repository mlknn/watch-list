'use client';
import {useT} from "@/components/product/language";
import {LanguageSelect} from '@/components/product/language';
import {T} from '@/components/product/language';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Plus,RefreshCw,Eye,Check,Pencil,Trash2,LoaderCircle,AlertCircle,Share2,Link2,Copy,Mail,LockKeyhole,ArrowLeft,CornerRightDown} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Empty,EmptyHeader,EmptyTitle,EmptyDescription} from '@/components/ui/empty';
import {resolveStockInput} from '@/lib/stock-search.mjs';
import {StockSearch} from '@/components/product/stock-search';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {AlertDialog,AlertDialogContent,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction} from '@/components/ui/alert-dialog';
import {Portfolio} from '@/components/product/portfolio';
import {PerformanceButton} from '@/components/product/performance-button';
import {PositionFields,emptyPosition,type PositionDraft} from '@/components/product/position-fields';
import {WatchlistBoard,WatchlistSummary} from '@/components/product/watchlist-summary';
import {ShareScorecard} from '@/components/product/share-scorecard';
import {shareCard} from '@/lib/share-card.mjs';
import {StocksTable} from '@/components/product/stocks-table';
import {Brand,ProductNav} from '@/components/product/nav';
import {ThemeToggle} from '@/components/product/theme';
import {SaveAccountPrompt} from '@/components/product/save-account-prompt';
import {MarketLockBanner} from '@/components/product/market-lock-banner';
import {parseCurrencyMismatch} from '@/lib/portfolio-currency.mjs';
import {apiJson,config,signedIn,claimGuestWatchlists} from '@/lib/auth-client';
import {marketChart} from '@/lib/market';
import {applyGuestAction,ensureGuestList,guestHasDraft,writeGuestState,markSavePromptShown} from '@/lib/guest-watchlist.mjs';
import {type AccountState,type Stock,type Watchlist,watchlistPerformance,price} from '@/lib/watchlist';
import {CompanyIcon} from '@/components/product/company-icon';
import {track} from '@/lib/analytics';
type Action={mode?:'basic'|'advanced';quantity?:number;costPerShare?:number;acquiredAt?:string;notes?:string;action:string;listId?:string;stockId?:string;name?:string;ticker?:string};
async function chartQuote(symbol:string){const chart=await marketChart(symbol);return {symbol:chart.symbol,companyName:chart.companyName,currency:chart.currency,exchange:chart.exchange,price:chart.quote.price,quoteTime:chart.quote.quoteTime||chart.fetchedAt,checkedAt:chart.fetchedAt};}
export function WatchlistWorkspace({compact=false}:{compact?:boolean}){const t=useT();
  const [position,setPosition]=useState<PositionDraft>(emptyPosition),[editing,setEditing]=useState<Stock|null>(null),[editDraft,setEditDraft]=useState<PositionDraft>(emptyPosition);
  const [state,setState]=useState<AccountState|null>(null),[activeId,setActiveId]=useState(''),[ticker,setTicker]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(''),[notice,setNotice]=useState(''),[dialog,setDialog]=useState<'create'|'rename'|'share'|null>(null),[name,setName]=useState(''),[deletion,setDeletion]=useState<{listId:string;stockId?:string;label:string}|null>(null),[configured,setConfigured]=useState<boolean|null>(null),[saveOpen,setSaveOpen]=useState(false);
  const [limitPrompt,setLimitPrompt]=useState(false),[canShare,setCanShare]=useState(false);
  const [addQuote,setAddQuote]=useState<Awaited<ReturnType<typeof chartQuote>>|null>(null);
  const lock=useRef(false),refreshing=useRef(false),generation=useRef(0),stateRef=useRef<AccountState|null>(null),inputRef=useRef<HTMLInputElement>(null),quantityRef=useRef<HTMLInputElement>(null);

  const apply=useCallback((data:AccountState)=>{if(stateRef.current&&Date.parse(data.updatedAt)<Date.parse(stateRef.current.updatedAt))return;stateRef.current=data;setState(data);setActiveId(current=>data.watchlists.some((list:Watchlist)=>list.id===current)?current:data.watchlists[0]?.id||'');},[]);
  const load=useCallback(async()=>{try{await config();setConfigured(true);if(await signedIn()){let claimed=null as AccountState|null;try{claimed=await claimGuestWatchlists();}catch(e){setError((e as Error).message);}apply(claimed||await apiJson<AccountState>('/api/watchlists'));if(claimed)setError('');return;}apply(ensureGuestList(window.localStorage));setError('');}catch(e){setError((e as Error).message);}},[apply]);
  const act=useCallback(async(input:Action,automatic=false):Promise<AccountState|null>=>{
    if(automatic){if(lock.current||refreshing.current||!stateRef.current)return null;refreshing.current=true;}
    else{if(lock.current)throw new Error('An update is already in progress.');lock.current=true;generation.current+=1;setBusy(input.action);setError('');setNotice('');}
    const token=generation.current;
    try{
      if(stateRef.current?.guest){
        if(input.action==='shareList'||input.action==='revokeShare'){setSaveOpen(true);throw new Error('Save your list to share it with friends.');}
        let quote:unknown;
        if(input.action==='addStock')quote=await chartQuote(input.ticker||'');
        if(input.action==='refresh'){
          const symbols=[...new Set(stateRef.current.watchlists.flatMap(list=>list.stocks.map(stock=>stock.symbol)))];
          const rows=await Promise.all(symbols.map(async symbol=>{
            try{return [symbol,await chartQuote(symbol)] as const;}
            catch{return [symbol,null] as const;}
          }));
          quote=Object.fromEntries(rows.filter((row):row is readonly[string,Awaited<ReturnType<typeof chartQuote>>]=>row[1]!==null));
        }
        const firstStock=!stateRef.current.watchlists.some(list=>list.stocks.length);
        const data=writeGuestState(applyGuestAction(stateRef.current,input,quote),window.localStorage);
        if(automatic&&token!==generation.current)return null;
        apply(data);
        if(input.action==='createList'||(input.action==='addStock'&&firstStock))track('watchlist_created');
        return data;
      }
      const data=input.action==='refresh'?await apiJson<AccountState>('/api/watchlists?refresh=1'):await apiJson<AccountState>('/api/watchlists',input);
      if(automatic&&token!==generation.current)return null;
      apply(data);
      if(input.action==='createList')track('watchlist_created');
      return data;
    }catch(e){if(!automatic){setError((e as Error).message);throw e;}return null;}
    finally{if(automatic)refreshing.current=false;else{lock.current=false;setBusy('');}}
  },[apply]);
  useEffect(()=>{void load();const refresh=()=>{if(!document.hidden&&stateRef.current)void act({action:'refresh'},true);};const timer=setInterval(refresh,60000);document.addEventListener('visibilitychange',refresh);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',refresh);};},[load,act]);
  useEffect(()=>{setCanShare(typeof navigator!=='undefined'&&typeof navigator.share==='function');},[]);
  const canRegisterTools=!!state&&!state.guest;
  useEffect(()=>{
    if(!canRegisterTools)return;
    type Tool={name:string;description:string;inputSchema:object;annotations:object;execute:(input:unknown)=>unknown};
    const context=(document as Document&{modelContext?:{registerTool:(tool:Tool,options:{signal:AbortSignal})=>unknown}}).modelContext;if(!context?.registerTool)return;const lifecycle=new AbortController();
    const register=(tool:Tool)=>{try{void Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(console.warn);}catch(e){console.warn(e);}};
    register({name:'read_watchlists',description:'Read this signed-in user’s saved watchlists and prices.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute:()=>stateRef.current});
    register({name:'add_stock_to_watchlist',description:'Add a stock to a watchlist owned by the signed-in user, within their plan limits.',inputSchema:{type:'object',properties:{listId:{type:'string'},ticker:{type:'string'},quantity:{type:'number',exclusiveMinimum:0}},required:['listId','ticker','quantity'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute:async input=>{const value=input as {listId?:unknown;ticker?:unknown;quantity?:unknown};if(!value||typeof value.listId!=='string'||typeof value.ticker!=='string'||typeof value.quantity!=='number'||!Number.isFinite(value.quantity)||value.quantity<=0)throw new Error('Provide listId, ticker, and a positive quantity.');const result=await act({action:'addStock',listId:value.listId,ticker:value.ticker,quantity:value.quantity});setActiveId(value.listId);return result?.watchlists.find(l=>l.id===value.listId);}});return()=>lifecycle.abort();
  },[act,canRegisterTools]);
  const active=state?.watchlists.find(l=>l.id===activeId)||state?.watchlists[0];const canEdit=!!state?.guest||active?.role==='owner';const stale=active?.stocks.filter(s=>s.quoteError).length||0;
  const marketError=parseCurrencyMismatch(error);
  const shareUrl=active?.shareToken&&typeof window!=='undefined'?`${window.location.origin}/share/${active.shareToken}`:'';
  const addLimited=!!state&&!!active&&active.stocks.length>=state.plan.maxStocks;
  function abandonAdd(){if(busy==='addStock')return;setAddQuote(null);setTicker('');setPosition(emptyPosition());}
  async function openAddModal(raw:string){if(!active||!raw.trim()||addLimited)return;setError('');inputRef.current?.blur();setBusy('quote');try{const symbol=await resolveStockInput(raw,active.stocks[0]?.currency);const quote=await chartQuote(symbol);setTicker(quote.symbol);setPosition(emptyPosition());setAddQuote(quote);}catch(e){setError((e as Error).message);}finally{setBusy('');}}
  async function addStock(e:React.FormEvent){e.preventDefault();void openAddModal(ticker);}
  async function confirmAdd(e:React.FormEvent){e.preventDefault();if(!active||!addQuote)return;try{await act({action:'addStock',listId:active.id,ticker:addQuote.symbol,...(active.mode==='advanced'?{quantity:Number(position.quantity),costPerShare:position.cost?Number(position.cost):undefined,acquiredAt:new Date(position.date+'T00:00:00').toISOString(),notes:position.notes}:{})});setNotice(`${addQuote.symbol} added.`);setAddQuote(null);setTicker('');setPosition(emptyPosition());inputRef.current?.focus({preventScroll:true});}catch(e){setError((e as Error).message);}}
  function warnLeave(e:React.MouseEvent<HTMLAnchorElement>){if(!state?.guest||state.savePromptShown||!guestHasDraft(state))return;e.preventDefault();setSaveOpen(true);}
  async function saveList(e:React.FormEvent){e.preventDefault();if(dialog!=='create'&&!active)return;try{const result=await act({action:dialog==='create'?'createList':'renameList',listId:active?.id,name:name.trim()||'My watchlist',mode:'advanced'});if(dialog==='create'&&result){const created=result.watchlists.find(l=>!state?.watchlists.some(old=>old.id===l.id));if(created)setActiveId(created.id);}setDialog(null);}catch{}}
  async function savePosition(e:React.FormEvent){e.preventDefault();if(!active||!editing)return;try{await act({action:'initializePosition',listId:active.id,stockId:editing.id,quantity:Number(editDraft.quantity),costPerShare:Number(editDraft.cost),acquiredAt:new Date(editDraft.date+'T00:00:00').toISOString(),notes:editDraft.notes});setEditing(null);}catch{}}
  async function remove(){if(!deletion)return;try{await act({action:deletion.stockId?'removeStock':'deleteList',listId:deletion.listId,stockId:deletion.stockId});setDeletion(null);}catch{}}
  async function openShare(){if(state?.guest){setSaveOpen(true);return;}if(!active||lock.current)return;setError('');setNotice('');setDialog('share');if(!active.shareToken&&canEdit){try{await act({action:'shareList',listId:active.id});}catch{/* Show the retry action in the open dialog. */}}}
  async function copy(){try{await navigator.clipboard.writeText(shareUrl);setNotice('Link copied.');}catch{setNotice('Select and copy the link above.');}}
  async function shareOut(){
    const card=active?shareCard(active):null;
    const title=card?.title||active?.name||'My watchlist';
    const text=card?.description||title;
    if(canShare){
      try{await navigator.share({title,text,url:shareUrl});return;}
      catch(e){if((e as Error).name==='AbortError')return;}
    }
    void copy();
  }
  const sharePreview=active?shareCard(active):null;
  const shareMail=`mailto:?subject=${encodeURIComponent(sharePreview?.title||'Take a look at my watchlist')}&body=${encodeURIComponent(`${sharePreview?.description||'Here’s what I’m watching:'}\n\n${shareUrl}`)}`;
  const member=!!state&&!state.guest;
  return <>{compact?<section className="home-watchlist" aria-label={t("Your watchlist")}>
  <div className="home-watchlist-heading"><div><h2>{active?.stocks.length?t("Your watchlist"):t("Start with one stock.")}</h2><p>{t("Add a company and follow its price from today.")}</p></div><a className="tool-link" href="/watchlists"><T text="Open full watchlist"/></a></div>
  {error&&!addQuote&&<p role="alert" className="error-banner">{error}<Button variant="ghost" onClick={()=>void load()}>{t("Retry")}</Button></p>}
  <span role="status" className="sr-only">{notice}</span>
  {state&&active?<>
    {canEdit&&<form className="home-watchlist-search" onSubmit={addStock}><StockSearch value={ticker} onChange={setTicker} onPick={symbol=>{void openAddModal(symbol);}} inputRef={inputRef} currency={active.stocks[0]?.currency}/><Button type="submit" className="primary-button" disabled={!!busy||!ticker.trim()||addLimited}>{busy?<LoaderCircle className="spin"/>:<Plus/>}<T text="Add stock"/></Button></form>}
    {state.guest&&!!active.stocks.length&&<StockPageHint placement="search"/>}
    {addLimited&&<p className="quote-warning">{t("Stock limit reached.")}</p>}
    {active.stocks.length?<CompactStocks stocks={active.stocks.slice(0,5)} hint={!!state.guest}/>:<p className="home-watchlist-empty"><T text="Search for your first stock above. Your watchlist will appear here."/></p>}
    <div className="home-watchlist-footer"><span>{state.guest?t("Saved on this device"):active.name} · {active.stocks.length} / {state.plan.maxStocks} {t("Stocks")}</span><span className="home-watchlist-footer-links">{active.stocks.length>5&&<a href="/watchlists"><T text="View all"/></a>}{state.guest?<button type="button" className="tool-link" onClick={()=>setSaveOpen(true)}><T text="Save with a free account"/></button>:<a href="/watchlists"><T text="Open full watchlist"/></a>}</span></div>
  </>:<p role="status">{t("Opening your watchlists…")}</p>}
</section>:<><header className="topbar"><div className="public-nav-main"><Brand/><ProductNav onNavigate={warnLeave}/></div><div className="account-nav"><ThemeToggle/>{state?.guest?<><a href="/login"><T text="Log in"/></a><button type="button" className="solid-link" onClick={()=>setSaveOpen(true)}><T text="Save portfolio"/></button></>:<><a href="/account"><T text="Account"/></a>{state?.user.analytics&&<a href="/insights">Analytics</a>}<span className="save-state">{busy?<LoaderCircle size={15} className="spin"/>:<Check size={15}/>} {busy?t("Updating…"):state?t("Saved to your account"):t("Connecting…")}</span></>}</div></header>
  <main className={'workspace'+(member?' is-member':'')}>{!member&&state&&<div className="page-heading dashboard-heading"><div className="dashboard-heading-copy"><p className="eyebrow">{t("YOUR INVESTING SPACE")}</p><h1><T text="My watchlists"/></h1><p className="intro"><T text="Keep your ideas close. Follow how they grow."/></p><div className="workspace-summary"><span><strong>{state.watchlists.length}</strong> / {state.plan.maxLists} {t("Watchlists")}</span><span>{t("Stocks")} · {state.plan.maxStocks} {t("per list")}</span></div></div><div className="heading-actions"><Button className="primary-button" disabled={!state||!!busy} onClick={()=>{setName('');setError('');if(state.watchlists.length>=1){setLimitPrompt(true);setSaveOpen(true);}else setDialog('create');}}><Plus/><T text="New watchlist"/></Button></div></div>}
  {member&&<WatchlistRail lists={state.watchlists} activeId={active?.id||''} maxLists={state.plan.maxLists} busy={!!busy} onSelect={id=>{setActiveId(id);abandonAdd();setError('');}} onCreate={()=>{setName('');setError('');setDialog('create');}}/>}
  {configured===false?<div className="watch-card"><Empty className="empty-watchlist"><LockKeyhole size={32}/><EmptyTitle className="empty-title">Your account workspace is almost ready</EmptyTitle><EmptyDescription>Account setup is still in progress. Once connected, sign in to create private lists and share them with friends.</EmptyDescription><a className="solid-link" href="/">Back to welcome</a></Empty></div>:<>
  {error&&!marketError&&!dialog&&!addQuote&&!deletion&&!editing&&<div role="alert" className="error-banner"><AlertCircle size={18}/>{error}<Button variant="ghost" onClick={()=>void load()}>{t("Retry")}</Button></div>}
  <span className="sr-only" role="status">{notice}</span>
  {state?.user.local&&!state.guest&&<p className="local-workspace-note">Saved on this Mac · Private workspace</p>}
  {state&&active?<section id="active-watchlist" className="watch-card"><div className="card-heading"><div><div className="list-title"><h2>{active.name}</h2><span className="owner-label">{active.mode==='advanced'?t("Advanced")+' · ':''}{canEdit?t("Owner"):t("Viewer")}</span>{canEdit&&<><button className="icon-button" aria-label="Rename watchlist" disabled={!!busy} onClick={()=>{setName(active.name);setError('');setDialog('rename');}}><Pencil size={14}/></button>{state.watchlists.length>1&&<button className="icon-button" aria-label="Delete watchlist" disabled={!!busy} onClick={()=>{setError('');setDeletion({listId:active.id,label:active.name});}}><Trash2 size={14}/></button>}</>}</div><p>{active.mode==='advanced'?t("Track your holdings, cost basis, and the bigger picture."):t("Track performance from the day you add a stock.")}</p></div><div className="card-tools">{state.guest&&<span className="save-state">{busy?<LoaderCircle size={15} className="spin"/>:<Check size={15}/>} {busy?t("Updating…"):t("Saved on this device")}</span>}<span className="refresh-state"><span className={`status-dot ${stale?'warning-dot':''}`}/>{busy==='refresh'?t("Refreshing…"):t("Refreshes every 60s")}</span><Button variant="outline" disabled={!!busy} onClick={()=>void openShare()}><Link2/><T text="Share"/></Button></div></div>
  {member&&<WatchlistBoard list={active}/>}
  <div className="watchlist-compose-row">{canEdit&&<form className={`add-bar ${active.mode==='advanced'?'advanced-add-bar':''}`} onSubmit={addStock}><StockSearch value={ticker} onChange={setTicker} onPick={symbol=>{void openAddModal(symbol);}} inputRef={inputRef} currency={active.stocks[0]?.currency}/><Button type="submit" className="primary-button" disabled={!!busy||!ticker.trim()||addLimited}>{busy==='quote'||busy==='addStock'?<LoaderCircle className="spin"/>:<Plus/>}{busy==='quote'?t("Loading…"):busy==='addStock'?t("Adding…"):t("Add stock")}</Button><Button type="button" variant="outline" className="refresh-button" disabled={!!busy} onClick={()=>void act({action:'refresh'}).catch(()=>{})}><RefreshCw className={busy==='refresh'?'spin':''}/><T text="Refresh"/></Button></form>}{!member&&<WatchlistSummary list={active}/>}</div>
  {marketError&&<MarketLockBanner message={error} onDismiss={()=>setError('')}/>}
  {addLimited&&<div className="quote-warning">This list can hold up to {state.plan.maxStocks} stocks. Remove one to add another.</div>}{stale>0&&<div className="quote-warning" role="status">{stale} quotes could not be refreshed. Last known prices are shown.</div>}



  {active.stocks.length?<div className="watchlist-analytics-layout"><div className="watchlist-table-pane"><StocksTable rowHint={state.guest?<StockPageHint inline/>:undefined} actions={<PerformanceButton list={active} version={state.updatedAt}/>} key={active.id} stocks={active.stocks} advanced={active.mode==='advanced'} onEdit={canEdit?(stock:Stock)=>{setError('');setEditing(stock);setEditDraft({quantity:String(stock.quantity||10),cost:String(stock.costPerShare||stock.addedPrice),date:(stock.acquiredAt||stock.addedAt).slice(0,10),notes:stock.notes});}:undefined} busy={!!busy} onRemove={canEdit?(stock:Stock)=>{setError('');setDeletion({listId:active.id,stockId:stock.id,label:stock.symbol});}:undefined}/></div><aside className="watchlist-chart-pane"><Portfolio list={active} version={state.updatedAt} guest={!!state.guest}/></aside></div>:<><div className="column-preview"><span><T text="COMPANY / TICKER"/></span><span><T text="DATE ADDED"/></span><span><T text="PRICE AT ADD"/></span><span><T text="CURRENT PRICE"/></span><span><T text="CHANGE"/></span></div><Empty className="empty-watchlist"><div className="empty-icon"><Eye size={27}/></div><EmptyHeader><EmptyTitle className="empty-title"><T text="Your next idea starts here"/></EmptyTitle><EmptyDescription>{t("Add a ticker, then enter shares and cost. The portfolio appears as soon as you add holdings.")}</EmptyDescription></EmptyHeader><div className="ticker-hints">{t("Try")} {['NVDA','ASML.AS','RY.TO','THYAO.IS'].map(s=><button key={s} type="button" onClick={()=>{setError('');setTicker(s);inputRef.current?.focus({preventScroll:true});inputRef.current?.scrollIntoView({behavior:'smooth',block:'center'});}}>{s}</button>)}</div></Empty></>}
  </section>:<Empty className="empty-watchlist"><LoaderCircle className="spin"/><EmptyTitle>{t("Opening your watchlists…")}</EmptyTitle></Empty>}
  {state&&active&&<section className="watchlist-invite-row"><div><strong><T text="Good ideas are better together"/></strong><p>{t("Share a read-only link so a friend can follow this watchlist.")}</p></div><Button variant="outline" className="outline-button" disabled={!!busy} onClick={()=>void openShare()}><Share2/><T text="Invite a friend"/></Button></section>}
  <footer className="workspace-footer"><LanguageSelect/><span>{t("Yahoo Finance · Quotes may be delayed")}</span><span>{t("Only the owner can edit · ")}<a href="/privacy"><T text="Privacy"/></a></span></footer>
  </>}</main></>}
  <Dialog open={!!addQuote} onOpenChange={v=>{if(!v)abandonAdd();}}><DialogContent className="list-dialog add-stock-dialog" initialFocus={false}><DialogTitle>{t("Add to watchlist")}</DialogTitle><DialogDescription>{t("Not added yet. Confirm to add this stock, or close to leave it off the list.")}</DialogDescription>{addQuote&&<div className="add-quote-panel"><div className="add-quote-identity"><CompanyIcon symbol={addQuote.symbol}/><div><strong>{addQuote.symbol}</strong><span>{addQuote.companyName}</span><small>{addQuote.exchange} · {addQuote.currency}</small></div></div><div className="add-quote-price"><span><T text="Current price"/></span><strong>{price(addQuote.price,addQuote.currency)}</strong></div></div>}<form onSubmit={confirmAdd}>{active?.mode==='advanced'&&<PositionFields value={position} onChange={setPosition} currency={addQuote?.currency||active.stocks[0]?.currency||'USD'} quantityRef={quantityRef}/>}{error&&!marketError&&<p role="alert" className="form-error">{error}</p>}<div className="add-stock-actions"><Button type="button" variant="outline" className="outline-button" disabled={!!busy} onClick={abandonAdd}><T text="Cancel"/></Button><Button type="submit" className="primary-button" disabled={!!busy||!addQuote}>{busy==='addStock'?<LoaderCircle className="spin"/>:<Plus/>}{busy==='addStock'?t("Adding…"):t("Add to watchlist")}</Button></div></form></DialogContent></Dialog>
  <Dialog open={dialog==='create'||dialog==='rename'} onOpenChange={v=>{if(!v&&!busy)setDialog(null);}}><DialogContent className="list-dialog"><DialogTitle>{dialog==='create'?t("New watchlist"):t("Rename watchlist")}</DialogTitle><DialogDescription>{state&&dialog==='create'&&state.watchlists.length>=state.plan.maxLists?`You’ve reached your limit of ${state.plan.maxLists} watchlists. Delete a watchlist to create another.`:dialog==='create'?'A name is optional. Leave it blank to use My watchlist.':'Keep your ideas together with a name that makes sense to you.'}</DialogDescription>{state&&dialog==='create'&&state.watchlists.length>=state.plan.maxLists?<Button className="primary-button dialog-submit" onClick={()=>setDialog(null)}><T text="Back to watchlists"/></Button>:<form onSubmit={saveList}><label className="form-label" htmlFor="list-name"><T text="Watchlist name"/></label><p className="field-note">{dialog==='create'?'Optional. Every watchlist includes quantities, costs and portfolio performance.':'Every watchlist includes quantities, costs and portfolio performance.'}</p><Input id="list-name" autoFocus maxLength={60} required={dialog==='rename'} placeholder="2027 AI Picks" value={name} onChange={e=>setName(e.target.value)}/>{error&&<p role="alert" className="form-error">{error}</p>}<Button type="submit" className="primary-button dialog-submit" disabled={!!busy||(dialog==='rename'&&!name.trim())}><T text="Save watchlist"/></Button></form>}</DialogContent></Dialog>
  <Dialog open={dialog==='share'} onOpenChange={v=>{if(!v&&!busy)setDialog(null);}}><DialogContent className="list-dialog share-dialog"><DialogTitle>{t("Good ideas are better together")}</DialogTitle><DialogDescription>Anyone with this link can view “{active?.name}”, including its starting prices, performance, share quantities, purchase costs and notes. Only you can edit. You can turn sharing off at any time.</DialogDescription>{state?.user.local&&<p className="setup-notice">No login is needed to view this link. This local address works only on this computer; sharing with friends on other devices requires deployment.</p>}{shareUrl?<>{active&&<ShareScorecard list={active} compact/>}<div className="share-link-field"><label className="form-label" htmlFor="share-link">{t("Read-only share link")}</label><Input id="share-link" readOnly value={shareUrl} onFocus={e=>e.target.select()}/></div><div className="share-actions">{canShare&&<Button className="primary-button" onClick={()=>void shareOut()}><Share2/>{t("Share")}</Button>}<Button className={canShare?'outline-button':'primary-button'} variant={canShare?'outline':'default'} onClick={()=>void copy()}><Copy/>{t("Copy link")}</Button><a className="email-invite" href={shareMail}><Mail size={16}/>{t("Invite by email")}</a></div><Button variant="ghost" className="revoke-button" disabled={!!busy} onClick={()=>{if(active)void act({action:'revokeShare',listId:active.id}).then(()=>{setDialog(null);setNotice('Sharing turned off. The old link no longer works.');}).catch(()=>{});}}> {t("Turn off sharing")}</Button></>:<div className="share-preparing" role="status">{busy==='shareList'?<><LoaderCircle className="spin" size={20}/>Preparing your link…</>:error?<Button variant="outline" onClick={()=>void openShare()}>Try again</Button>:<span>Only the owner can enable sharing.</span>}</div>}{notice&&<p role="status" className="share-notice">{notice}</p>}{error&&<p role="alert" className="form-error">{error}</p>}</DialogContent></Dialog>
  <Dialog open={!!editing} onOpenChange={v=>{if(!v&&!busy)setEditing(null);}}><DialogContent className="position-dialog"><DialogTitle>Set {editing?.symbol} quantity</DialogTitle><DialogDescription>This stock was added before quantities were available. Set its quantity once. Shares and purchase details cannot be changed after saving.</DialogDescription><form onSubmit={savePosition}><PositionFields value={editDraft} onChange={setEditDraft} editing currency={editing?.currency||'USD'}/>{error&&<p role="alert" className="form-error">{error}</p>}<Button className="primary-button dialog-submit" disabled={!!busy}>{t("Save fixed quantity")}</Button></form></DialogContent></Dialog>
  <AlertDialog open={!!deletion} onOpenChange={v=>{if(!v&&!busy)setDeletion(null);}}><AlertDialogContent><AlertDialogTitle>Remove {deletion?.label}?</AlertDialogTitle><AlertDialogDescription>This removes {deletion?.stockId?'the stock and its starting price':'the watchlist, its stocks, and its share link'} from your account.</AlertDialogDescription>{error&&<p role="alert" className="form-error">{error}</p>}<AlertDialogFooter><AlertDialogCancel disabled={!!busy}>{t("Keep it")}</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={!!busy} onClick={()=>void remove()}>{busy?t("Removing…"):t("Remove")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  <SaveAccountPrompt reason={limitPrompt?"list-limit":undefined} open={saveOpen} listName={active?.name} onOpenChange={v=>{setSaveOpen(v);if(!v)setLimitPrompt(false);if(!v&&state?.guest)apply(markSavePromptShown(state,window.localStorage));}}/>
  </>;
}
function WatchlistRail({lists,activeId,maxLists,busy,onSelect,onCreate}:{lists:Watchlist[];activeId:string;maxLists:number;busy:boolean;onSelect:(id:string)=>void;onCreate:()=>void}){
  const t=useT();
  return <aside className="watchlist-rail">
    <div className="watchlist-rail-head">
      <p className="eyebrow">{t("MY WATCHLISTS")}</p>
      <h1><T text="My watchlists"/></h1>
      <p>{lists.length} / {maxLists}</p>
    </div>
    <ul className="watchlist-rail-list">
      {lists.map(list=>{
        const change=watchlistPerformance(list);
        return <li key={list.id}>
          <button type="button" className={list.id===activeId?'is-active':undefined} aria-current={list.id===activeId?'true':undefined} onClick={()=>onSelect(list.id)}>
            <span className="watchlist-rail-copy">
              <span className="watchlist-rail-name">{list.name}</span>
              <span className="watchlist-rail-count">{list.stocks.length} {t("Stocks")}</span>
            </span>
            <span className={'watchlist-rail-change'+(change===null?'':change>=0?' up':' down')} aria-label={t("Since created")}>{change===null?'—':`${change>=0?'+':''}${change.toFixed(1)}%`}</span>
          </button>
        </li>;
      })}
    </ul>
    <Button className="primary-button watchlist-rail-new" disabled={busy||lists.length>=maxLists} onClick={onCreate}><Plus/><T text="New watchlist"/></Button>
  </aside>;
}

/* Guests land here before they know a ticker opens a full company page. */
export function StockPageHint({inline=false,placement}:{inline?:boolean;placement?:'inline'|'search'}){
  const where=placement||(inline?'inline':'search');
  const Icon=where==='search'?CornerRightDown:ArrowLeft;
  return <span className={`stock-page-hint hint-${where}`}><Icon size={13} aria-hidden="true"/><span className="hint-text"><T text="Click a company to learn more about it"/></span></span>;
}
const shareCount=(quantity:number|null)=>quantity===null?'—':Number.isInteger(quantity)?String(quantity):String(Number(quantity.toFixed(4)));
function CompactStocks({stocks,hint=false}:{stocks:Stock[];hint?:boolean}){
  const t=useT();
  return <div className="home-watchlist-table"><table><caption className="sr-only">{t("Your watchlist")}</caption><thead><tr><th>{t("Company")}</th><th className="shares-column">{t("Shares")}</th><th>{t("Starting price")}</th><th>{t("Latest price")}</th><th>{t("Since added")}</th></tr></thead><tbody>{stocks.map((stock,index)=>{
    const change=stock.addedPrice>0?(stock.currentPrice/stock.addedPrice-1)*100:null;
    return <tr key={stock.id}><th scope="row"><a href={'/stocks/'+encodeURIComponent(stock.symbol)}><CompanyIcon symbol={stock.symbol}/><span className="home-company"><span className="home-ticker">{stock.symbol}</span><small>{stock.companyName}</small><small className="row-shares">{shareCount(stock.quantity)} {t("Shares")}</small></span>{hint&&index===0&&<StockPageHint inline/>}</a></th><td className="shares-column">{shareCount(stock.quantity)}</td><td>{price(stock.addedPrice,stock.currency)}</td><td className={change===null?'':change>=0?'up':'down'}>{price(stock.currentPrice,stock.currency)}{change===null?'':<span className="latest-pct">{`${change>=0?'+':''}${change.toFixed(2)}%`}</span>}</td><td className={change===null?'':change>=0?'up':'down'}>{change===null?'—':`${change>=0?'+':''}${change.toFixed(2)}%`}</td></tr>;
  })}</tbody></table></div>;
}
