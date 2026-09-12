import {MARKET_NAMES,parseCurrencyMismatch} from '@/lib/portfolio-currency.mjs';

export function localizedListError(message:string,t:(text:string)=>string){
  const mismatch=parseCurrencyMismatch(message);
  if(!mismatch)return t(message);
  return t('This list holds {list} stocks. Add {market} stocks to a new list so currencies stay separate.')
    .replace('{list}',t(MARKET_NAMES[mismatch.list as keyof typeof MARKET_NAMES]||mismatch.list))
    .replace('{market}',t(MARKET_NAMES[mismatch.stock as keyof typeof MARKET_NAMES]||mismatch.stock));
}
