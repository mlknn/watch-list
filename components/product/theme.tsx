'use client';
import {createContext,useContext,useEffect,useState,useCallback} from 'react';
import {Moon,Sun} from 'lucide-react';
import {useT} from '@/components/product/language';

export type Theme='dark'|'light';
const KEY='watchlist-theme';
const Ctx=createContext<{theme:Theme;toggle:()=>void}>({theme:'dark',toggle:()=>{}});

export function ThemeProvider({children}:{children:React.ReactNode}){
  /* Start on the server default so hydration matches, then adopt the saved theme. */
  const [theme,setTheme]=useState<Theme>('dark');
  useEffect(()=>{
    const saved=window.localStorage.getItem(KEY);
    const next=saved==='light'?'light':'dark';
    setTheme(next);
    document.documentElement.classList.toggle('dark',next==='dark');
  },[]);
  const toggle=useCallback(()=>{
    setTheme(current=>{
      const next=current==='dark'?'light':'dark';
      window.localStorage.setItem(KEY,next);
      document.documentElement.classList.toggle('dark',next==='dark');
      return next;
    });
  },[]);
  return <Ctx.Provider value={{theme,toggle}}>{children}</Ctx.Provider>;
}

export function useTheme(){return useContext(Ctx);}

export function useChartPalette(){
  const {theme}=useTheme();
  return theme==='light'
    ?{up:'#14845b',down:'#c34851',grid:'#e2e7ef',ref:'#c5d0de',tooltipBg:'#fff',tooltipFg:'#202b40',tooltipBorder:'#e2e7ef',cost:'#8b98ab',bar:'#9bb0e8',dot:'#fff'}
    :{up:'#3dff8f',down:'#ff4458',grid:'#2a4438',ref:'#3a5248',tooltipBg:'#101a16',tooltipFg:'#ffffff',tooltipBorder:'#2a4438',cost:'#8aa094',bar:'#2a6b4a',dot:'#101a16'};
}

export function ThemeToggle(){
  const {theme,toggle}=useTheme();
  const t=useT();
  const label=theme==='dark'?t('Switch to light theme'):t('Switch to dark theme');
  return <button type="button" className="theme-toggle" aria-label={label} title={label} onClick={toggle}>
    {theme==='dark'?<Sun size={18} aria-hidden="true"/>:<Moon size={18} aria-hidden="true"/>}
  </button>;
}
