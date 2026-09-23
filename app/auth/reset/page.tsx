'use client';
import {useState} from 'react';
import {Eye,EyeOff} from 'lucide-react';
import {authClient,config,localAuth} from '@/lib/auth-client';
import {PublicNav,PublicFooter} from '@/components/product/nav';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {T,useT} from '@/components/product/language';

export default function Reset(){
  const t=useT();
  const [password,setPassword]=useState('');
  const [visible,setVisible]=useState(false);
  const [message,setMessage]=useState('');
  const [ok,setOk]=useState(false);
  const [busy,setBusy]=useState(false);
  async function submit(e:React.FormEvent){
    e.preventDefault();
    setBusy(true);
    setMessage('');
    setOk(false);
    try{
      if((await config()).localMode){
        const token=new URLSearchParams(window.location.hash.slice(1)).get('token');
        await localAuth({action:'updatePassword',token,password});
        window.history.replaceState(null,'','/auth/reset');
        setOk(true);
        setMessage(t('Password updated. You can now sign in.'));
        return;
      }
      const client=await authClient();
      const {error}=await client.auth.updateUser({password});
      if(error)throw error;
      setOk(true);
      setMessage(t('Password updated. You can now sign in.'));
    }catch(e){
      setOk(false);
      setMessage((e as Error).message);
    }finally{
      setBusy(false);
    }
  }
  return <><PublicNav/><main className="message-page">
    <h1><T text="Choose a new password"/></h1>
    <form onSubmit={submit}>
      <label htmlFor="password" className="form-label">{t('New password')}</label>
      <div className="password-field">
        <Input id="password" type={visible?'text':'password'} minLength={6} autoComplete="new-password" required value={password} onChange={e=>setPassword(e.target.value)} aria-describedby={message?'reset-status':undefined}/>
        <button type="button" className="password-toggle" aria-pressed={visible} aria-label={visible?t('Hide password'):t('Show password')} onClick={()=>setVisible(v=>!v)}>{visible?<EyeOff size={16}/>:<Eye size={16}/>}</button>
      </div>
      <Button className="primary-button dialog-submit" disabled={busy}>{busy?t('Updating…'):t('Update password')}</Button>
    </form>
    {message&&<p id="reset-status" role={ok?'status':'alert'} className={ok?'share-notice':'form-error'}>{message}</p>}
    <a href="/login">{t('Back to sign in')} →</a>
  </main><PublicFooter/></>;
}
