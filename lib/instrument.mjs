/** Quote display unit from provider metadata, with ticker fallbacks only when type is missing. */

export function quoteUnit({symbol,quoteType}={}){
  const type=String(quoteType||'').toUpperCase();
  if(type==='INDEX')return 'points';
  if(type==='FUTURE'||type==='CURRENCY'||type==='CRYPTOCURRENCY'||type==='EQUITY'||type==='ETF')return 'currency';
  const ticker=String(symbol||'');
  if(ticker.startsWith('^'))return 'points';
  return 'currency';
}
