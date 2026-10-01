'use client';
import {SlidersHorizontal,ScanLine} from 'lucide-react';
import {useT} from './language';
import {Input} from '@/components/ui/input';
import {emptyScan,scanPresets,scanError} from '@/lib/market-scanner.mjs';
export type Scan=typeof emptyScan;
export function MarketScanner({value,onChange,currencies}:{value:Scan;onChange:(scan:Scan)=>void;currencies:string[]}){
  const t=useT();
  const error=scanError(value);
  const fields=[['minPrice','Min price'],['maxPrice','Max price'],['minChange','Min daily change (%)'],['maxChange','Max daily change (%)'],['minVolume','Min volume (shares)']] as const;
  return <div className="market-scanner">
    <header><div><ScanLine size={22} aria-hidden="true"/><h3>{t('Stock scanner')}</h3><span>{t('No account needed')}</span></div><p>{t('Start with a scan, then fine-tune your filters.')}</p></header>
    <fieldset className="scanner-presets" aria-label={t('Quick scans')}>{scanPresets.map(preset=>{const next={...emptyScan,...preset.values};const active=Object.keys(emptyScan).every(key=>value[key as keyof Scan]===next[key as keyof Scan]);return <button key={preset.id} type="button" aria-pressed={active} onClick={()=>onChange(next)}>{t(preset.label)}</button>;})}</fieldset>
    <details className="scanner-advanced"><summary><SlidersHorizontal size={16} aria-hidden="true"/>{t('Customize scan')}<span>{Object.values(value).filter(Boolean).length} {t('active filters')}</span></summary><div className="scanner-fields">
      {fields.map(([key,label])=><label key={key}>{t(label)}<Input type="number" inputMode="decimal" step="any" min={key.includes('Change')?undefined:0} value={value[key]} aria-invalid={!!error} onChange={event=>onChange({...value,[key]:event.target.value})} placeholder={t('Any')}/></label>)}
      <label>{t('Quote currency')}<select value={value.currency} onChange={event=>onChange({...value,currency:event.target.value})}><option value="">{t('All currencies')}</option>{currencies.map(currency=><option key={currency} value={currency}>{currency}</option>)}</select></label>
      <label>{t('52-week position')}<select value={value.range} onChange={event=>onChange({...value,range:event.target.value})}><option value="">{t('Anywhere')}</option><option value="high">{t('Top 10% of range')}</option><option value="low">{t('Bottom 10% of range')}</option></select></label>
    </div></details>
    {error&&<p className="form-error" role="alert">{t(error)}</p>}
    <p className="scanner-note">{t('Scans cover this market’s listed selection, not every exchange listing. Missing or stale quotes are excluded.')}</p>
    <p className="scanner-note">{t('Price filters use each quote’s currency. Volume is reported trading volume, not relative volume.')}</p>
  </div>;
}
