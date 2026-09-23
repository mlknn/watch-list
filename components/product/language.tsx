'use client';
import {createContext,useContext,useEffect,useSyncExternalStore} from 'react';
import dictionary from '@/lib/translations.json';
type Lang='en'|'tr'|'es';
const Context=createContext<{lang:Lang;setLang:(lang:Lang)=>void}>({lang:'en',setLang:()=>{}});
const listeners=new Set<()=>void>();
let hydrated=false;
function emit(){for(const listener of listeners)listener();}
function readLang():Lang{
  if(typeof window==='undefined'||!hydrated)return 'en';
  try{
    const saved=window.localStorage.getItem('watchlist-language');
    return saved==='tr'||saved==='es'?saved:'en';
  }catch{return 'en';}
}
function subscribe(onStoreChange:()=>void){
  listeners.add(onStoreChange);
  const onStorage=(event:StorageEvent)=>{if(!event.key||event.key==='watchlist-language')onStoreChange();};
  window.addEventListener('storage',onStorage);
  return()=>{listeners.delete(onStoreChange);window.removeEventListener('storage',onStorage);};
}
export function LanguageProvider({children}:{children:React.ReactNode}){
  const lang=useSyncExternalStore<Lang>(subscribe,readLang,():Lang=>'en');
  useEffect(()=>{
    hydrated=true;
    emit();
  },[]);
  useEffect(()=>{document.documentElement.lang=lang;},[lang]);
  return <Context.Provider value={{lang,setLang:value=>{
    try{window.localStorage.setItem('watchlist-language',value);}catch{/* Language still updates in this session. */}
    emit();
  }}}>{children}</Context.Provider>;
}
export function useLang(){return useContext(Context).lang;}
export function useT(){const {lang}=useContext(Context);return (text:string)=>lang==='en'?text:(dictionary as Record<string,string[]>)[text]?.[lang==='tr'?0:1]||text;}
export function T({text}:{text:string}){const t=useT();return <>{t(text)}</>;}
export function LanguageSelect(){const {lang,setLang}=useContext(Context);return <select className="language-select" aria-label="Language / Dil / Idioma" value={lang} onChange={e=>setLang(e.target.value as Lang)}><option value="en">English</option><option value="tr">Türkçe</option><option value="es">Español</option></select>;}
