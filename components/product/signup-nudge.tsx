'use client';

import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {ArrowRight,LoaderCircle} from 'lucide-react';
import {useT,T} from '@/components/product/language';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogDescription,DialogTitle} from '@/components/ui/dialog';
import {authClient,config,signedIn,type Config} from '@/lib/auth-client';

const SNOOZE_KEY='watchlist:signup-nudge-until';
const SNOOZE_MS=7*24*60*60*1000;
const WAIT_MS=25_000;

function canShowOn(path:string){
  return !['/login','/signup','/forgot-password','/account','/insights','/privacy','/auth'].some(route=>path===route||path.startsWith(route+'/'));
}

export function SignupNudge(){
  const t=useT();
  const path=usePathname()||'/';
  const [settings,setSettings]=useState<Config|null>(null);
  const [openedAtPath,setOpenedAtPath]=useState('');
  const snoozedUntil=useRef(0);
  const open=openedAtPath===path;
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');

  useEffect(()=>{
    if(!openedAtPath||openedAtPath===path)return;
    const timer=window.setTimeout(()=>setOpenedAtPath(''),0);
    return()=>window.clearTimeout(timer);
  },[openedAtPath,path]);

  useEffect(()=>{
    let alive=true;
    if(!canShowOn(path))return()=>{alive=false;};
    const timer=window.setTimeout(()=>{
      void(async()=>{
        try{
          const current=await config();
          if(!alive||!current.authReady)return;
          if(await signedIn()||!alive)return;
          let until=0;
          try{until=Number(window.localStorage.getItem(SNOOZE_KEY)||0);}catch{/* The prompt can still appear when storage is blocked. */}
          if(Math.max(until,snoozedUntil.current)>Date.now())return;
          setSettings(current);
          setOpenedAtPath(path);
          snoozedUntil.current=Date.now()+SNOOZE_MS;
          try{window.localStorage.setItem(SNOOZE_KEY,String(snoozedUntil.current));}catch{/* The prompt can still appear when storage is blocked. */}
        }catch{/* Account setup or browser storage may be unavailable. */}
      })();
    },WAIT_MS);
    return()=>{alive=false;window.clearTimeout(timer);};
  },[path]);

  async function continueWithGoogle(){
    if(!settings?.authReady)return;
    setBusy(true);setError('');
    try{
      const client=await authClient();
      const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:settings.appUrl+'/auth/callback?next='+encodeURIComponent('/watchlists')}});
      if(error)throw error;
    }catch(e){setError((e as Error).message);setBusy(false);}
  }

  return <Dialog open={open} onOpenChange={value=>{if(!busy&&!value)setOpenedAtPath('');}}>
    <DialogContent className="list-dialog signup-nudge">
      <DialogTitle>{t('Keep your ideas with you')}</DialogTitle>
      <DialogDescription>{t('Create a free account to save watchlists and favorites, then pick up on any device.')}</DialogDescription>
      <p className="signup-nudge-benefit">{t('Free: up to 5 watchlists and 20 stocks per list. No card needed.')}</p>
      {error&&<p className="form-error" role="alert">{error}</p>}
      {settings?.googleEnabled&&<Button className="primary-button signup-nudge-google" disabled={busy} onClick={()=>void continueWithGoogle()}>
        {busy?<LoaderCircle className="spin"/>:<span className="google-mark" aria-hidden="true">G</span>}<T text="Continue with Google"/>
      </Button>}
      <Link className="signup-nudge-email" href="/signup?next=%2Fwatchlists"><T text="Continue with email"/><ArrowRight size={16}/></Link>
      <p className="auth-bottom"><Link href="/login?next=%2Fwatchlists">{t('Already have an account? Sign in')}</Link></p>
      <Button variant="ghost" className="signup-nudge-later" disabled={busy} onClick={()=>setOpenedAtPath('')}>{t('Maybe later')}</Button>
    </DialogContent>
  </Dialog>;
}
