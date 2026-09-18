'use client';
import {useT} from "@/components/product/language";
import {T} from '@/components/product/language';
import {useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
import {config,authClient,signOut} from '@/lib/auth-client';
import {useAccessRefresh} from '@/lib/access-refresh';
import {LanguageSelect} from './language';
import {LogoMark} from './logo';
import {ThemeToggle} from './theme';

export function Brand() { return <><a className="brand" href="/"><span className="brand-logo"><LogoMark/></span>StockWatchlist<span className="brand-light">.app</span></a></>; }

const PRODUCT_LINKS=[
 {href:'/watchlists',label:'Watchlists'},
 {href:'/dashboard',label:'Markets'},
 {href:'/earnings',label:'Earnings'},
];

/** One set of product links everywhere, so the three tools feel like one app. */
export function ProductNav({onNavigate}:{onNavigate?:(e:React.MouseEvent<HTMLAnchorElement>)=>void}){
 const t=useT();
 const path=usePathname()||'';
 return <nav className="product-nav" aria-label="Main navigation">
  {PRODUCT_LINKS.map(link=>{
   const active=path===link.href||path.startsWith(link.href+'/');
   return <a key={link.href} href={link.href} onClick={active?undefined:onNavigate} className={'product-nav-link'+(active?' is-active':'')} aria-current={active?'page':undefined}>{t(link.label)}</a>;
  })}
 </nav>;
}

function useMember(){
 const epoch=useAccessRefresh();
 const [member,setMember]=useState(false);
 useEffect(()=>{let alive=true;void config().then(async c=>{if(!c.authReady)return false;if(c.localMode){const r=await fetch('/api/local-auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'session'}),credentials:'same-origin',cache:'no-store'});return r.ok;}const {data}=await(await authClient()).auth.getUser();return !!data.user;}).then(value=>{if(alive)setMember(!!value);}).catch(()=>{if(alive)setMember(false);});return()=>{alive=false;};},[epoch]);
 return member;
}

function SignOutButton(){
 const t=useT();
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 return <>
  <button type="button" className="nav-signout" disabled={busy} onClick={()=>{setBusy(true);setError('');void signOut().catch(()=>{setBusy(false);setError(t("Could not sign out. Try again."));});}}>{busy?t("Signing out…"):t("Log out")}</button>
  {error&&<span role="alert">{error}</span>}
 </>;
}

export function PublicNav() {
 const member=useMember();
 return <header className="topbar public-nav">
  <div className="public-nav-main">
   <Brand/>
   <ProductNav/>
  </div>
  <div className="nav-secondary">
   <ThemeToggle/>
   {member?<a className="nav-quiet" href="/account"><T text="Account"/></a>:<a className="nav-quiet" href="/login"><T text="Log in"/></a>}
  </div>
 </header>;
}

export function PublicFooter() {
 const member=useMember();
 return <footer className="public-footer"><Brand/><LanguageSelect/><p className="footer-tagline"><T text="Good ideas deserve a starting point."/></p><nav className="footer-links" aria-label="Footer"><a href="/watchlists"><T text="Watchlists"/></a><a href="/dashboard"><T text="Markets"/></a><a href="/earnings"><T text="Earnings"/></a><a href="/#about"><T text="About"/></a><a href="/compare"><T text="Compare"/></a><a href="/open-source"><T text="Open source"/></a><a href="https://github.com/mlknn/watch-list" rel="noopener noreferrer"><T text="GitHub"/></a><a href="/privacy"><T text="Privacy"/></a>{member&&<a href="/account"><T text="Account"/></a>}{member?<SignOutButton/>:<a href="/login"><T text="Log in"/></a>}</nav></footer>;
}
