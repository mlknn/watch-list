'use client';
import {createContext,useContext,useEffect,useState} from 'react';
import dictionary from '@/lib/translations.json';
type Lang='en'|'tr'|'es';
const Context=createContext<{lang:Lang;setLang:(lang:Lang)=>void}>({lang:'en',setLang:()=>{}});
function readLang():Lang{
  if(typeof window==='undefined')return 'en';
  const saved=window.localStorage.getItem('watchlist-language');
  return saved==='tr'||saved==='es'?saved:'en';
}
export function LanguageProvider({children}:{children:React.ReactNode}){
  const [lang,setLang]=useState<Lang>(readLang);
  useEffect(()=>{document.documentElement.lang=lang;},[lang]);
  return <Context.Provider value={{lang,setLang:value=>{setLang(value);window.localStorage.setItem('watchlist-language',value);}}}>{children}</Context.Provider>;
}
export function useLang(){return useContext(Context).lang;}
export function useT(){const {lang}=useContext(Context);return (text:string)=>lang==='en'?text:(dictionary as Record<string,string[]>)[text]?.[lang==='tr'?0:1]||text;}
export function T({text}:{text:string}){const t=useT();return <>{t(text)}</>;}
export function LanguageSelect(){const {lang,setLang}=useContext(Context);return <select className="language-select" aria-label="Language / Dil / Idioma" value={lang} onChange={e=>setLang(e.target.value as Lang)}><option value="en">English</option><option value="tr">Türkçe</option><option value="es">Español</option></select>;}
