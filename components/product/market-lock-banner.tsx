'use client';
import {useT} from '@/components/product/language';
import {AlertCircle} from 'lucide-react';
import {localizedListError} from '@/lib/list-error';
export function MarketLockBanner({message,onDismiss}:{message:string;onDismiss?:()=>void}){
 const t=useT();
 return <div className="market-lock-banner" role="alert">
  <AlertCircle size={18} aria-hidden="true"/>
  <div>
   <strong>{t("Wrong market for this list")}</strong>
   <p>{localizedListError(message,t)}</p>
  </div>
  {onDismiss&&<button type="button" className="market-lock-dismiss" onClick={onDismiss}>{t("Dismiss")}</button>}
 </div>;
}
