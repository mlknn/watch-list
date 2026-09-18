'use client';
import {useT} from "@/components/product/language";
import {T} from '@/components/product/language';
import {useEffect,useState} from 'react';
import {config,authClient,signOut} from '@/lib/auth-client';
import {useAccessRefresh} from '@/lib/access-refresh';
import { ArrowUpRight } from 'lucide-react';
import {LanguageSelect} from './language';
import {LogoMark} from './logo';
import {ThemeToggle} from './theme';

export function Brand() { return <><a className="brand" href="/"><span className="brand-logo"><LogoMark/></span>StockWatchlist<span className="brand-light">.app</span></a></>; }

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
 return <header className="topbar public-nav"><div className="public-nav-main"><Brand/><nav aria-label="Main navigation">{member?<a className="solid-link" href="/watchlists"><T text="My watchlists"/></a>:<><a className="nav-extra" href="/dashboard"><T text="Dashboard"/></a><a className="nav-extra" href="/#about"><T text="About"/></a><a className="nav-extra" href="/privacy"><T text="Privacy"/></a><a className="nav-extra" href="/login"><T text="Log in"/></a><a className="solid-link" href="/watchlists"><T text="Build a portfolio"/><ArrowUpRight size={16}/></a></>}</nav></div><ThemeToggle/></header>;
}

export function PublicFooter() {
 const member=useMember();
 return <footer className="public-footer"><Brand/><LanguageSelect/><p className="footer-tagline"><T text="Good ideas deserve a starting point."/></p><nav className="footer-links" aria-label="Footer"><a href="/dashboard"><T text="Dashboard"/></a>{member&&<a href="/watchlists"><T text="My watchlists"/></a>}<a href="/#about"><T text="About"/></a><a href="/compare"><T text="Compare"/></a><a href="/open-source"><T text="Open source"/></a><a href="https://github.com/mlknn/watch-list" rel="noopener noreferrer"><T text="GitHub"/></a><a href="/privacy"><T text="Privacy"/></a>{member&&<a href="/account"><T text="Account"/></a>}{member?<SignOutButton/>:<a href="/login"><T text="Log in"/></a>}</nav></footer>;
}
