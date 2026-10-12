'use client';

import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {ArrowRight,LoaderCircle} from 'lucide-react';
import {useT,T} from '@/components/product/language';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogDescription,DialogTitle} from '@/components/ui/dialog';
import {authClient,config,signedIn,type Config} from '@/lib/auth-client';

const ACTIVE_TIME_KEY='watchlist:signup-active-time';
const WAIT_MS=15_000;
const REQUIRE_AFTER_MS=120_000;

function promptCopy(path:string){
  if(path==='/earnings')return {title:'Keep up with earnings season',continueLabel:'Continue viewing earnings'};
  if(path==='/dashboard')return {title:'Stay ahead of market moves',continueLabel:'Continue browsing markets'};
  if(path==='/history')return {title:'See how market leaders changed',continueLabel:'Continue viewing market history'};
  if(path==='/watchlists')return {title:'Keep your watchlists saved',continueLabel:'Continue browsing watchlists'};
  if(path.startsWith('/stocks/'))return {title:'Keep this company on your radar',continueLabel:'Continue viewing this company'};
  if(path==='/compare')return {title:'Make smarter company comparisons',continueLabel:'Continue comparing companies'};
  if(path.startsWith('/share/'))return {title:'Start a watchlist of your own',continueLabel:'Continue browsing'};
  if(path==='/')return {title:'Keep your ideas with you',continueLabel:'Continue browsing'};
  return {title:'Keep your ideas with you',continueLabel:'Continue browsing'};
}

function canShowOn(path:string){
  return !['/login','/signup','/forgot-password','/account','/insights','/privacy','/auth'].some(route=>path===route||path.startsWith(route+'/'));
}

function isAuthPage(path:string){
  return ['/login','/signup','/forgot-password','/auth'].some(route=>path===route||path.startsWith(route+'/'));
}

export function SignupNudge(){
  const t=useT();
  const path=usePathname()||'/';
  const copy=promptCopy(path);
  const [settings,setSettings]=useState<Config|null>(null);
  const [authStatus,setAuthStatus]=useState<'checking'|'signed-out'|'signed-in'>('checking');
  const [openedAtPath,setOpenedAtPath]=useState('');
  const elapsed=useRef(0);
  const requiredRef=useRef(false);
  const [required,setRequired]=useState(false);
  const requiredActive=required&&authStatus==='signed-out'&&!isAuthPage(path);
  const open=requiredActive||openedAtPath===path;
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');

  useEffect(()=>{
    try{elapsed.current=Math.max(0,Number(window.sessionStorage.getItem(ACTIVE_TIME_KEY))||0);}catch{/* Keep a session-only timer in memory. */}
    if(elapsed.current>=REQUIRE_AFTER_MS){requiredRef.current=true;setRequired(true);}
    let lastAt=Date.now();
    const tick=()=>{
      const now=Date.now();
      if(document.visibilityState==='visible')elapsed.current+=Math.max(0,Math.min(now-lastAt,1500));
      lastAt=now;
      try{window.sessionStorage.setItem(ACTIVE_TIME_KEY,String(elapsed.current));}catch{/* Keep counting in memory if storage is blocked. */}
      if(elapsed.current>=REQUIRE_AFTER_MS&&!requiredRef.current){requiredRef.current=true;setRequired(true);}
    };
    const resetTick=()=>{lastAt=Date.now();};
    const timer=window.setInterval(tick,1000);
    document.addEventListener('visibilitychange',resetTick);
    return()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',resetTick);};
  },[]);

  useEffect(()=>{
    let alive=true;
    const refreshAuth=()=>{
      void signedIn().then(member=>{
        if(!alive)return;
        setAuthStatus(member?'signed-in':'signed-out');
        if(member){
          elapsed.current=0;requiredRef.current=false;setRequired(false);setOpenedAtPath('');
          try{window.sessionStorage.removeItem(ACTIVE_TIME_KEY);}catch{/* Session is already authenticated. */}
        }else if(elapsed.current>=REQUIRE_AFTER_MS){requiredRef.current=true;setRequired(true);}
      }).catch(()=>{if(alive)setAuthStatus('checking');});
    };
    refreshAuth();
    window.addEventListener('watchlist:auth-change',refreshAuth);
    return()=>{alive=false;window.removeEventListener('watchlist:auth-change',refreshAuth);};
  },[path]);

  useEffect(()=>{
    if(!openedAtPath||openedAtPath===path)return;
    const timer=window.setTimeout(()=>setOpenedAtPath(''),0);
    return()=>window.clearTimeout(timer);
  },[openedAtPath,path]);

  useEffect(()=>{
    let alive=true;
    if(!canShowOn(path)||authStatus!=='signed-out'||required)return()=>{alive=false;};
    const timer=window.setTimeout(()=>{
      void(async()=>{
        try{
          const current=await config();
          if(!alive||!current.authReady)return;
          if(await signedIn()||!alive)return;
          setSettings(current);
          setOpenedAtPath(path);
        }catch{/* Account setup or browser storage may be unavailable. */}
      })();
    },WAIT_MS);
    return()=>{alive=false;window.clearTimeout(timer);};
  },[authStatus,path,required]);

  async function continueWithGoogle(){
    if(!settings?.authReady)return;
    setBusy(true);setError('');
    try{
      const client=await authClient();
      const next=path+(window.location.search||'');
      const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:settings.appUrl+'/auth/callback?next='+encodeURIComponent(next)}});
      if(error)throw error;
    }catch(e){setError((e as Error).message);setBusy(false);}
  }

  return <Dialog open={open} onOpenChange={value=>{if(!busy&&!requiredActive&&!value)setOpenedAtPath('');}}>
    <DialogContent className="list-dialog signup-nudge" showCloseButton={!requiredActive}>
      <DialogTitle>{t(copy.title)}</DialogTitle>
      <DialogDescription>{t(requiredActive?'Sign in or create a free account to continue browsing.':'Create a free account to save watchlists and favorites, then pick up on any device.')}</DialogDescription>
      <p className="signup-nudge-benefit">{t('Free: up to 5 watchlists and 20 stocks per list. No card needed.')}</p>
      {error&&<p className="form-error" role="alert">{error}</p>}
      {settings?.googleEnabled&&<Button className="primary-button signup-nudge-google" disabled={busy} onClick={()=>void continueWithGoogle()}>
        {busy?<LoaderCircle className="spin"/>:<span className="google-mark" aria-hidden="true">G</span>}<T text="Continue with Google"/>
      </Button>}
      <Link className="signup-nudge-email" href={'/signup?next='+encodeURIComponent(path)}><T text="Continue with email"/><ArrowRight size={16}/></Link>
      <p className="auth-bottom"><Link href={'/login?next='+encodeURIComponent(path)}>{t('Already have an account? Sign in')}</Link></p>
      {!requiredActive&&<Button variant="ghost" className="signup-nudge-later" disabled={busy} onClick={()=>setOpenedAtPath('')}>{t(copy.continueLabel)}</Button>}
    </DialogContent>
  </Dialog>;
}
