'use client';
import {useT} from "@/components/product/language";
import {T} from '@/components/product/language';
import {useEffect,useState} from 'react';
import {ArrowUpRight,Eye,EyeOff,Mail,LockKeyhole,CheckCircle2,LoaderCircle} from 'lucide-react';
import {PublicNav,PublicFooter} from './nav';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {authClient,config,localAuth,type Config} from '@/lib/auth-client';
import {guestHasDraft,readGuestState} from '@/lib/guest-watchlist.mjs';
import {safeReturnPath} from '@/lib/safe-return.mjs';

function PasswordField({id,value,onChange,autoComplete,minLength,errorId}:{id:string;value:string;onChange:(value:string)=>void;autoComplete:string;minLength?:number;errorId?:string}){
  const t=useT();
  const [visible,setVisible]=useState(false);
  return <div className="password-field">
    <Input id={id} type={visible?'text':'password'} autoComplete={autoComplete} minLength={minLength} required value={value} onChange={e=>onChange(e.target.value)} aria-invalid={!!errorId} aria-describedby={errorId}/>
    <button type="button" className="password-toggle" aria-pressed={visible} aria-label={visible?t('Hide password'):t('Show password')} onClick={()=>setVisible(v=>!v)}>{visible?<EyeOff size={16}/>:<Eye size={16}/>}</button>
  </div>;
}

export function AuthForm({mode}:{mode:'signup'|'login'|'reset'}){
  const t=useT();
  const [delivery,setDelivery]=useState<{url:string;label:string}|null>(null);
  const [settings,setSettings]=useState<Config|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[sent,setSent]=useState(false),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[name,setName]=useState(''),[draftName,setDraftName]=useState('');
  const [nextPath,setNextPath]=useState('/watchlists');
  const heading=mode==='signup'?t('Create your account'):mode==='reset'?t('Reset your password'):t('Sign in');
  useEffect(()=>{
    if(typeof window!=='undefined')setNextPath(safeReturnPath(new URLSearchParams(window.location.search).get('next'),'/watchlists'));
    void config().then(async c=>{
      setSettings(c);
      if(mode==='signup'&&typeof window!=='undefined'){
        const guest=readGuestState(window.localStorage);
        if(guestHasDraft(guest))setDraftName(guest.watchlists.find(list=>list.stocks?.length)?.name||t('your watchlist'));
      }
      if(mode==='reset'||!c.authReady)return;
      if(c.localMode){
        const result=await localAuth({action:'session'});
        if(result.user)window.location.replace(nextPath);
      }else{
        const client=await authClient();
        const {data}=await client.auth.getSession();
        if(data.session)window.location.replace(nextPath);
      }
    }).catch(e=>setError(e.message));
  },[mode,nextPath,t]);
  async function social(provider:'google'|'apple'){
    setBusy(true);setError('');
    try{
      const client=await authClient();
      const {error}=await client.auth.signInWithOAuth({provider,options:{redirectTo:settings!.appUrl+'/auth/callback?next='+encodeURIComponent(nextPath)}});
      if(error)throw error;
    }catch(e){setError((e as Error).message);setBusy(false);}
  }
  async function submit(e:React.FormEvent){
    e.preventDefault();setBusy(true);setError('');
    try{
      if(settings?.localMode){
        const result=await localAuth({action:mode==='signup'?'signup':mode==='reset'?'reset':'login',email,password,name});
        if(mode==='login')window.location.assign(nextPath);
        else{setDelivery(result.localDelivery||null);setSent(true);}
        return;
      }
      const client=await authClient();
      if(mode==='signup'){
        const {error}=await client.auth.signUp({email,password,options:{data:{full_name:name.trim()},emailRedirectTo:settings!.appUrl+'/auth/callback?next='+encodeURIComponent(nextPath)}});
        if(error)throw error;setSent(true);
      }else if(mode==='reset'){
        const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:settings!.appUrl+'/auth/reset'});
        if(error)throw error;setSent(true);
      }else{
        const {data,error}=await client.auth.signInWithPassword({email,password});
        if(error)throw error;
        if(!data.user?.email_confirmed_at)throw new Error(t('Check your email and verify your account first.'));
        window.location.assign(nextPath);
      }
    }catch(e){setError((e as Error).message);}
    finally{setBusy(false);}
  }
  async function resend(){
    setBusy(true);setError('');
    try{
      if(settings?.localMode){
        const result=await localAuth({action:'resend',email});
        setDelivery(result.localDelivery||null);
        return;
      }
      const client=await authClient();
      const {error}=await client.auth.resend({type:'signup',email,options:{emailRedirectTo:settings!.appUrl+'/auth/callback?next='+encodeURIComponent(nextPath)}});
      if(error)throw error;setSent(true);
    }catch(e){setError((e as Error).message);}
    finally{setBusy(false);}
  }
  const errorId=error?'auth-error':undefined;
  return <><PublicNav/><main className="auth-layout">
    <aside className="auth-aside">
      <p className="eyebrow"><T text="YOUR MARKET, WITH COMPANY"/></p>
      {mode==='reset'
        ?<><h1>{t('Reset your password')}</h1><p>{t('Enter the email on the account. We will send a reset link if it can receive mail.')}</p></>
        :mode==='signup'
          ?<><h1>{t('Create your account')}</h1><p>{draftName?t('Your guest watchlist stays on this device until it is saved to the account.'):t('Give yours a place to grow. Follow stocks, remember your starting point, and bring friends along for the ride.')}</p></>
          :<><h1>{t('Sign in')}</h1><p>{t('Pick up where your ideas left off.')}</p></>}
      {mode!=='reset'&&<div className="auth-benefits"><span><CheckCircle2/> {t("Prices update automatically")}</span><span><CheckCircle2/> {t("Your starting price stays fixed")}</span><span><CheckCircle2/> {t("Share a view, keep control")}</span></div>}
    </aside>
    <section className="auth-card">
      <span className="auth-card-icon">{sent?<Mail/>:<LockKeyhole/>}</span>
      <h2>{sent?(settings?.localMode?t('Your local inbox'):t("Check your inbox")):heading}</h2>
      <p>{sent?(settings?.localMode?t('Email delivery is simulated on this computer. Open the local link below to continue.'):t('If this email can receive the link, it’s on its way. Open it in this browser to continue.')):mode==='signup'?(draftName?`${t('Create a free account to save')} ${draftName}. ${t('Your holdings on this device stay with the account.')}`:t("Build first if you want — or create an account now.")):mode==='reset'?t('We will email a reset link if this address has an account.'):t("Pick up where your ideas left off.")}</p>
      {settings?.localMode&&<div className="setup-notice">{t('Local accounts · Saved on this computer. Verification links appear here; no email is sent. Google and Apple sign-in become available after service setup.')}</div>}
      {settings&&!settings.authReady&&<div className="setup-notice">{t('Sign-up and sign-in will open once account setup is complete.')}</div>}
      {error&&<p id="auth-error" role="alert" className="form-error">{error}</p>}
      {sent?<div className="sent-panel">
        <strong>{email}</strong>
        {delivery&&<a className="solid-link" href={delivery.url}>{delivery.label} →</a>}
        <p>{mode==='signup'?t('Verify your email before signing in.'):t('Follow the link to choose a new password.')}</p>
        {mode==='signup'&&<Button variant="outline" disabled={busy} onClick={()=>void resend()}>{t('Resend verification email')}</Button>}
        <a href="/login">{t('Back to sign in')} →</a>
      </div>:<>
        {mode!=='reset'&&(settings?.googleEnabled||settings?.appleEnabled)&&<>
          <div className="social-buttons">
            {settings.googleEnabled&&<Button variant="outline" disabled={busy||!settings.authReady} onClick={()=>void social('google')}><span className="google-mark">G</span><T text="Continue with Google"/></Button>}
            {settings.appleEnabled&&<Button variant="outline" disabled={busy||!settings.authReady} onClick={()=>void social('apple')}><span aria-hidden="true"></span><T text="Continue with Apple"/></Button>}
          </div>
          <div className="auth-divider"><span><T text="or use your email"/></span></div>
        </>}
        <form onSubmit={submit}>
          {mode==='signup'&&<><label className="form-label" htmlFor="name"><T text="Your name"/></label><Input id="name" autoComplete="name" required maxLength={60} value={name} onChange={e=>setName(e.target.value)}/></>}
          <label className="form-label" htmlFor="email"><T text="Email address"/></label>
          <Input id="email" type={mode==='login'&&settings?.localMode?'text':'email'} autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" aria-invalid={!!error} aria-describedby={errorId}/>
          {mode!=='reset'&&<>
            <label className="form-label" htmlFor="password"><T text="Password"/></label>
            <PasswordField id="password" value={password} onChange={setPassword} autoComplete={mode==='signup'?'new-password':'current-password'} minLength={mode==='signup'?6:1} errorId={errorId}/>
            {mode==='signup'&&<span className="field-note"><T text="Use at least 6 characters."/></span>}
          </>}
          <Button className="primary-button dialog-submit" type="submit" disabled={busy||!settings?.authReady}>{busy?<LoaderCircle className="spin"/>:<ArrowUpRight/>}{mode==='signup'?t("Create account"):mode==='reset'?t("Send reset link"):t("Sign in")}</Button>
        </form>
        {mode==='signup'?<p className="auth-bottom">{t("Already watching? ")}<a href="/login"><T text="Sign in"/></a></p>
          :mode==='reset'?<p className="auth-bottom"><a href="/login"><T text="Back to sign in"/></a></p>
          :<p className="auth-bottom"><a href="/signup"><T text="Create an account"/></a> · <a href="/forgot-password"><T text="Forgot password?"/></a></p>}
      </>}
      <p className="auth-privacy">{t("Your lists start private. ")}<a href="/privacy">{t("How we use your data")}</a></p>
    </section>
  </main><PublicFooter/></>;
}
