'use client';
import {useEffect,useState,useRef} from 'react';
import {authClient,claimGuestWatchlists,config,localAuth} from '@/lib/auth-client';
import {PublicNav,PublicFooter} from '@/components/product/nav';
import {safeReturnPath} from '@/lib/safe-return.mjs';
import {T,useT} from '@/components/product/language';

export default function Callback(){
  const t=useT();
  const [error,setError]=useState('');
  const [migrationNote,setMigrationNote]=useState('');
  const started=useRef(false);
  useEffect(()=>{
    if(started.current)return;
    started.current=true;
    void(async()=>{
      const next=safeReturnPath(new URLSearchParams(window.location.search).get('next'),'/watchlists');
      try{
        if((await config()).localMode){
          const token=new URLSearchParams(window.location.hash.slice(1)).get('token');
          await localAuth({action:'verify',token});
          window.history.replaceState(null,'','/auth/callback');
          try{await claimGuestWatchlists();}
          catch{setMigrationNote(t('Your guest watchlist is still on this device. Open Watchlists and try saving again.'));}
          window.location.replace(next);
          return;
        }
        const params=new URLSearchParams(window.location.search);
        if(params.has('error'))throw new Error(params.get('error_description')||t('Sign-in was canceled.'));
        const client=await authClient();
        const {data,error}=await client.auth.getUser();
        if(error||!data.user)throw new Error(t('This link expired or was opened in a different browser. Sign in or request another link.'));
        if(!data.user.email_confirmed_at)throw new Error(t('Please verify your email first.'));
        try{await claimGuestWatchlists();}
        catch{setMigrationNote(t('Your guest watchlist is still on this device. Open Watchlists and try saving again.'));}
        window.location.replace(next);
      }catch(e){setError((e as Error).message);}
    })();
  },[t]);
  return <><PublicNav/><main className="message-page">
    <h1>{error?t('Could not complete sign-in'):t('Finishing sign-in…')}</h1>
    <p role={error?'alert':'status'}>{error||t('Your watchlists are just a moment away.')}</p>
    {migrationNote&&<p className="quote-warning" role="status">{migrationNote}</p>}
    {error&&<a className="solid-link" href="/login">{t('Back to sign in')}</a>}
  </main><PublicFooter/></>;
}
