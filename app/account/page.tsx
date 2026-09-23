'use client';
import {T,useT} from '@/components/product/language';
import {useEffect,useState} from 'react';
import {ArrowUpRight,Globe,LogOut,Check,List} from 'lucide-react';
import {Brand,PublicFooter} from '@/components/product/nav';
import {ThemeToggle} from '@/components/product/theme';
import {Button} from '@/components/ui/button';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
import {apiJson,signOut} from '@/lib/auth-client';
import {type AccountState} from '@/lib/watchlist';
import countries from '@/lib/countries.json';
export default function Account(){
  const t=useT();
  const [state,setState]=useState<AccountState|null>(null),[country,setCountry]=useState('none'),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>{void apiJson<AccountState>('/api/watchlists').then(s=>{setState(s);setCountry(s.user.country||'none');}).catch(e=>setError(e.message));},[]);
  const savedCountry=state?.user.country||'none';
  const dirty=country!==savedCountry;
  const usedLists=state?.watchlists.length||0;
  const usedStocks=state?.watchlists.reduce((n,list)=>n+list.stocks.length,0)||0;
  async function save(){setBusy(true);setError('');try{setState(await apiJson<AccountState>('/api/account',{country:country==='none'?null:country}));setNotice(t("Location preference saved."));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <><header className="topbar"><Brand/><div className="account-nav"><ThemeToggle/><a className="quiet-link" href="/watchlists">{t("← Back to my watchlists")}</a></div></header>
    <main className="account-page">
      <p className="eyebrow"><T text="YOUR OWN CORNER OF THE MARKET"/></p>
      <h1><T text="Your account"/></h1>
      {error&&<p className="error-banner" role="alert">{error}</p>}
      {notice&&<p className="success-banner" role="status"><Check size={17}/>{notice}</p>}
      {state?<>
        <section className="account-card">
          <div>
            <p className="eyebrow">{t('Identity')}</p>
            <h2>{state.user.name}</h2>
            <p>{state.user.email}</p>
            <span className="verified-label"><Check size={14}/>{state.user.local?t("Local account verified"):t("Verified email")}</span>
          </div>
          <Button variant="outline" disabled={busy} onClick={()=>{setBusy(true);void signOut().catch(e=>{setError(e.message);setBusy(false);});}}><LogOut/>{t("Sign out")}</Button>
        </section>
        <section className="account-card">
          <div>
            <span className="account-icon"><List/></span>
            <p className="eyebrow">{t('List limits')}</p>
            <h2><T text="Watchlists"/></h2>
            <p>{t('Used')} {usedLists} / {state.plan.maxLists} {t('watchlists')} · {usedStocks} {t('stocks across lists')} · {state.plan.maxStocks} {t('per list')}.</p>
          </div>
        </section>
        {state.user.analytics&&<section className="account-card">
          <div>
            <h2><T text="Product analytics"/></h2>
            <p>{t('Owner-only counts of unique browsers and events.')}</p>
          </div>
          <a className="solid-link" href="/insights">{t("Open analytics")} <ArrowUpRight size={16}/></a>
        </section>}
        <section className="account-card country-card">
          <div>
            <span className="account-icon"><Globe/></span>
            <p className="eyebrow">{t('Preferences')}</p>
            <h2><T text="A dot on the map. Only if you want."/></h2>
            <p>{t('This optional country is only used for the public community map. It is not used for quotes, tax, or billing.')}</p>
          </div>
          <div className="country-controls">
            <Select value={country} onValueChange={v=>setCountry(String(v))}>
              <SelectTrigger aria-label={t('Country for community map')}><SelectValue>{country==='none'?t("Keep my location private"):countries.find(c=>c.code===country)?.name}</SelectValue></SelectTrigger>
              <SelectContent><SelectItem value="none">{t("Keep my location private")}</SelectItem>{countries.map(c=><SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
            <Button className="primary-button" disabled={busy||!dirty} onClick={()=>void save()}><T text="Save preference"/></Button>
          </div>
        </section>
      </>:!error&&<p>{t("Loading your account…")}</p>}
    </main>
    <PublicFooter/>
  </>;
}
