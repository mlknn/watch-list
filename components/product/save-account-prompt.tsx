'use client';
import Link from 'next/link';
import type {Stock} from '@/lib/watchlist';
import {useEffect,useState} from 'react';
import {T,useT} from '@/components/product/language';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {authClient,config,type Config} from '@/lib/auth-client';

export function SaveAccountPrompt({open,onOpenChange,reason,listName,stocks=[]}:{reason?:'list-limit';open:boolean;onOpenChange:(open:boolean)=>void;listName?:string;stocks?:Stock[]}){
  const t=useT();
  const [settings,setSettings]=useState<Config|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  useEffect(()=>{if(!open)return;let alive=true;void config().then(value=>{if(alive){setSettings(value);setError('');}}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;};},[open]);
  async function social(provider:'google'|'apple'){
    setBusy(true);setError('');
    try{
      const client=await authClient();
      const {error}=await client.auth.signInWithOAuth({provider,options:{redirectTo:(settings||await config()).appUrl+'/auth/callback'}});
      if(error)throw error;
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  return <Dialog open={open} onOpenChange={value=>{if(!busy)onOpenChange(value);}}>
    <DialogContent className="list-dialog save-prompt" showCloseButton={!busy}>
      <DialogTitle>{reason==='list-limit'?t("Make room for more ideas"):t("Save your watchlist")}</DialogTitle>
      <DialogDescription>{reason==='list-limit'?t("Guests get one watchlist. Create a free account for up to five, and keep the stocks you have already added."):t("Create a free account to save this list and come back to it anytime. Everything you entered on this device stays with the account.")}</DialogDescription>
      {!!stocks.length&&<div className="save-list-preview"><strong>{listName}</strong><p>{t('Stocks')}: {stocks.length} · {t('Starting prices and notes included')}</p><ul aria-label={t('Stocks to save')}>{stocks.slice(0,6).map(stock=><li key={stock.id}>{stock.symbol}</li>)}{stocks.length>6&&<li>+{stocks.length-6}</li>}</ul><p>{t('Free account: up to 5 watchlists, 20 stocks each. No card needed.')}</p></div>}
      {error&&<p role="alert" className="form-error">{error}</p>}
      {(settings?.googleEnabled||settings?.appleEnabled)&&<div className="social-buttons">
        {settings.googleEnabled&&<Button variant="outline" disabled={busy||!settings.authReady} onClick={()=>void social('google')}><span className="google-mark">G</span><T text="Continue with Google"/></Button>}
        {settings.appleEnabled&&<Button variant="outline" disabled={busy||!settings.authReady} onClick={()=>void social('apple')}><span aria-hidden="true"></span><T text="Continue with Apple"/></Button>}
      </div>}
      <div className="share-actions save-prompt-actions">
        <Link className="solid-link" href="/signup?next=%2Fwatchlists" aria-disabled={busy} onClick={event=>{if(busy)event.preventDefault();}}>{settings?.googleEnabled||settings?.appleEnabled?t("Continue with email"):t("Create a free account")}</Link>
        <Button variant="ghost" disabled={busy} onClick={()=>onOpenChange(false)}>{t("Continue for now")}</Button>
      </div>
      <p className="auth-bottom"><Link href="/login?next=%2Fwatchlists">{t("Already have an account? Sign in")}</Link></p>
    </DialogContent>
  </Dialog>;
}
