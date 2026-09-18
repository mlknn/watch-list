'use client';
import {useEffect,useState} from 'react';
import {T,useT} from '@/components/product/language';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {authClient,config,type Config} from '@/lib/auth-client';

export function SaveAccountPrompt({open,onOpenChange,reason}:{reason?:'list-limit';open:boolean;onOpenChange:(open:boolean)=>void;listName?:string}){
  const t=useT();
  const [settings,setSettings]=useState<Config|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  useEffect(()=>{if(!open)return;setError('');void config().then(setSettings).catch(e=>setError(e.message));},[open]);
  async function social(provider:'google'|'apple'){
    setBusy(true);setError('');
    try{
      const client=await authClient();
      const {error}=await client.auth.signInWithOAuth({provider,options:{redirectTo:(settings||await config()).appUrl+'/auth/callback'}});
      if(error)throw error;
    }catch(e){setError((e as Error).message);setBusy(false);}
  }
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="list-dialog save-prompt">
      <DialogTitle>{reason==='list-limit'?t("Make room for more ideas"):t("Don’t lose your portfolio")}</DialogTitle>
      <DialogDescription>{reason==='list-limit'?t("Guests get one watchlist. Create a free account for up to five, and keep the stocks you have already added."):t("Create a free account to save this list and come back to it anytime. Everything you entered on this device stays with the account.")}</DialogDescription>
      {error&&<p role="alert" className="form-error">{error}</p>}
      {(settings?.googleEnabled||settings?.appleEnabled)&&<div className="social-buttons">
        {settings.googleEnabled&&<Button variant="outline" disabled={busy||!settings.authReady} onClick={()=>void social('google')}><span className="google-mark">G</span><T text="Continue with Google"/></Button>}
        {settings.appleEnabled&&<Button variant="outline" disabled={busy||!settings.authReady} onClick={()=>void social('apple')}><span aria-hidden="true"></span><T text="Continue with Apple"/></Button>}
      </div>}
      <div className="share-actions save-prompt-actions">
        <a className="solid-link" href="/signup">{settings?.googleEnabled||settings?.appleEnabled?t("or Email"):t("Create a free account")}</a>
        <Button variant="ghost" onClick={()=>onOpenChange(false)}>{t("Continue for now")}</Button>
      </div>
    </DialogContent>
  </Dialog>;
}
