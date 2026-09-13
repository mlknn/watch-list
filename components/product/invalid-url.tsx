'use client';
import {useEffect} from 'react';
import {AlertCircle} from 'lucide-react';
import {PublicNav,PublicFooter} from '@/components/product/nav';
import {T} from '@/components/product/language';

export function InvalidUrl(){
  useEffect(()=>{
    const timer=window.setTimeout(()=>{window.location.replace('/dashboard');},2000);
    return()=>window.clearTimeout(timer);
  },[]);
  return <><PublicNav/><main className="message-page"><h1><T text="Invalid URL"/></h1><p className="error-banner" role="alert"><AlertCircle size={18}/><T text="This page does not exist."/></p><p role="status"><T text="Navigating to the dashboard page…"/></p></main><PublicFooter/></>;
}
