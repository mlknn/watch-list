'use client';
import {AlertCircle} from 'lucide-react';
import {PublicNav,PublicFooter} from '@/components/product/nav';
import {T,useT} from '@/components/product/language';

export function InvalidUrl(){
  const t=useT();
  return <><PublicNav/><main className="message-page">
    <h1><T text="This page does not exist."/></h1>
    <p className="error-banner" role="alert"><AlertCircle size={18}/>{t('The address is not a page in StockWatchlist.')}</p>
    <p>{t('Use one of these paths to continue.')}</p>
    <div className="not-found-actions">
      <a className="solid-link" href="/">{t('Go home')}</a>
      <a className="outline-link" href="/dashboard">{t('Browse markets')}</a>
      <button type="button" className="outline-link" onClick={()=>window.history.length>1?window.history.back():window.location.assign('/')}>{t('Go back')}</button>
    </div>
  </main><PublicFooter/></>;
}
