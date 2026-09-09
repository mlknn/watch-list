'use client';
import {createClient,type SupabaseClient} from '@supabase/supabase-js';
export type Config={localMode:boolean;authReady:boolean;supabaseUrl:string;supabaseKey:string;appUrl:string;googleEnabled:boolean;appleEnabled:boolean;billingReady:boolean;trialDays:number};
let configPromise:Promise<Config>|null=null;
let clientPromise:Promise<SupabaseClient>|null=null;
export function config(){return configPromise??=fetch('/api/config',{cache:'no-store'}).then(async r=>{if(!r.ok)throw new Error('Could not connect. Please reload.');return await r.json() as Config;}).catch(e=>{configPromise=null;throw e;});}
export function authClient(){return clientPromise??=config().then(c=>{if(!c.authReady)throw new Error('Sign-up is not available yet. Account setup is still in progress.');return createClient(c.supabaseUrl,c.supabaseKey,{auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});}).catch(e=>{clientPromise=null;throw e;});}
export async function apiFetch(path:string,init:RequestInit={},requireLogin=true){
  const settings=await config();
  if(settings.localMode){const response=await fetch(path,{...init,credentials:'same-origin',cache:'no-store'});if(response.status===401&&requireLogin){invalidateAccess();window.location.assign('/login');}return response;}
  if(!settings.authReady&&!requireLogin)return fetch(path,{...init,cache:'no-store'});
  const client=await authClient();const {data,error}=await client.auth.getSession();
  if(error||!data.session){if(!requireLogin)return fetch(path,{...init,cache:'no-store'});window.location.assign('/login');throw new Error('Please sign in to continue.');}
  const headers=new Headers(init.headers);headers.set('Authorization','Bearer '+data.session.access_token);
  const response=await fetch(path,{...init,headers,cache:'no-store'});
  if(response.status===401&&requireLogin){await client.auth.signOut({scope:'local'});window.location.assign('/login');}
  return response;
}
export async function apiJson<T>(path:string,input?:unknown):Promise<T>{
  const response=await apiFetch(path,input===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
  const result=await response.json() as T&{error?:string};if(!response.ok)throw new Error(result.error||'Request failed.');return result;
}
export async function localAuth(input:unknown){const response=await fetch('/api/local-auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input),credentials:'same-origin'});const data=await response.json() as {error?:string;localDelivery?:{url:string;label:string};user?:{id:string}};if(!response.ok)throw new Error(data.error||'Account request failed.');return data;}
export function invalidateAccess(){window.dispatchEvent(new Event('watchlist:auth-change'));try{localStorage.setItem('watchlist:auth-change',String(Date.now())+Math.random());}catch{/* Same-tab invalidation still applies if storage is unavailable. */}}
export async function signOut(){invalidateAccess();if((await config()).localMode){await localAuth({action:'logout'});invalidateAccess();window.location.assign('/');return;}const client=await authClient();const {error}=await client.auth.signOut();if(error)throw error;invalidateAccess();window.location.assign('/');}
