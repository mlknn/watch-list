import type {Metadata} from 'next';
import {getQuote} from '@/server/quotes.mjs';

export async function generateMetadata({params}:{params:Promise<{symbol:string}>}):Promise<Metadata>{
  const {symbol:raw}=await params;
  const symbol=decodeURIComponent(raw||'').toUpperCase();
  if(!/^[A-Z0-9^][A-Z0-9.^=-]{0,24}$/.test(symbol))return {title:'Stock details | StockWatchlist'};
  let name=symbol;
  try{
    const quote=await getQuote(symbol);
    if(quote?.companyName)name=quote.companyName;
  }catch{/* Ticker-only title when the quote provider misses. */}
  const title=`${name} (${symbol}) Stock Price, Chart & Earnings | StockWatchlist`;
  const description=`View ${name} (${symbol}) stock price, chart, key financial metrics, earnings and company information.`;
  const url=`https://stockwatchlist.app/stocks/${encodeURIComponent(symbol)}`;
  return {
    title,
    description,
    alternates:{canonical:url},
    openGraph:{title,description,url,siteName:'StockWatchlist',type:'website'},
    twitter:{card:'summary_large_image',title,description},
  };
}

export default function StockLayout({children}:{children:React.ReactNode}){
  return children;
}
