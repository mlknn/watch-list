'use client';
import {useState} from 'react';
import {authClient} from '@/lib/auth-client';
import {PublicNav} from '@/components/product/nav';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
export default function Reset(){const [password,setPassword]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);try{const client=await authClient();const {error}=await client.auth.updateUser({password});if(error)throw error;setMessage('Password updated. You can now sign in.');}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}return <><PublicNav/><main className="message-page"><h1>Choose a new password</h1><form onSubmit={submit}><label htmlFor="password" className="form-label">New password</label><Input id="password" type="password" minLength={12} autoComplete="new-password" required value={password} onChange={e=>setPassword(e.target.value)}/><Button className="primary-button dialog-submit" disabled={busy}>Update password</Button></form><p role="status">{message}</p><a href="/login">Sign in →</a></main></>;}
