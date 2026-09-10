'use client';
import {useT} from "@/components/product/language";
import {T} from '@/components/product/language';
import {useEffect,useState} from 'react';
import {config,authClient,signOut} from '@/lib/auth-client';
import {useAccessRefresh} from '@/lib/access-refresh';
import { ArrowUpRight } from 'lucide-react';
import {LanguageSelect} from './language';
import {LogoMark} from './logo';

export function Brand() { return <><a className="brand" href="/"><span className="brand-logo"><LogoMark/></span>watch<span className="brand-light">list</span></a></>; }

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
  <button type="button" className="nav-signout" disabled={busy} onClick={()=>{setBusy(true);setError('');void signOut().catch(()=>{setBusy(false);setError('Could not sign out. Try again.');});}}>{busy?'Signing out…':t("Log out")}</button>
  {error&&<span role="alert">{error}</span>}
 </>;
}

export function PublicNav() {
 const member=useMember();
 return <header className="topbar public-nav"><Brand/><nav aria-label="Main navigation">{member?<a className="solid-link" href="/watchlists"><T text="My watchlists"/></a>:<><a className="nav-extra" href="/dashboard"><T text="Dashboard"/></a><a className="nav-extra" href="/#about"><T text="About"/></a><a className="nav-extra" href="/pricing"><T text="Pricing"/></a><a className="nav-extra" href="/privacy"><T text="Privacy"/></a><a className="nav-extra" href="/login"><T text="Log in"/></a><a className="solid-link" href="/signup"><T text="Start watching"/><ArrowUpRight size={16}/></a></>}</nav></header>;
}

export function PublicFooter() {
 const member=useMember();
 return <footer className="public-footer"><Brand/><LanguageSelect/><span><T text="Good ideas deserve a starting point."/></span><a href="/dashboard"><T text="Dashboard"/></a>{member&&<a href="/watchlists"><T text="My watchlists"/></a>}<a href="/#about"><T text="About"/></a><a href="/privacy"><T text="Privacy"/></a><a href="/pricing"><T text="Plans"/></a>{member&&<a href="/account"><T text="Account"/></a>}{member?<SignOutButton/>:<a href="/login"><T text="Log in"/></a>}</footer>;
}
