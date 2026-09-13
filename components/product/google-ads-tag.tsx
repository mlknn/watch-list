'use client';
import {useEffect} from 'react';

const ADS_ID='AW-18447742703';

declare global {
  interface Window {
    dataLayer?:unknown[];
    gtag?:(...args:unknown[])=>void;
  }
}

export function GoogleAdsTag(){
  useEffect(()=>{
    if(window.location.hostname!=='stockwatchlist.app'||window.gtag)return;
    window.dataLayer=window.dataLayer||[];
    window.gtag=function gtag(){window.dataLayer!.push(arguments);};
    const script=document.createElement('script');
    script.async=true;
    script.src='https://www.googletagmanager.com/gtag/js?id='+ADS_ID;
    script.onload=()=>{window.gtag?.('js',new Date());window.gtag?.('config',ADS_ID);};
    document.head.appendChild(script);
  },[]);
  return null;
}
