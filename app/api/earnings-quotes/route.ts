import {getChart} from '@/server/charts.mjs';
import {failure,publicJson,publicRate} from '@/server/http.mjs';

export async function GET(request:Request){
  try{
    publicRate(request,'earnings-quotes',20,60);
    const params=new URL(request.url).searchParams;
    const symbols=[...new Set((params.get('symbols')||'').split(',').map(value=>value.trim().toUpperCase()).filter(value=>/^[A-Z0-9.^=-]{1,24}$/.test(value)))].slice(0,100);
    const quotes:Array<{symbol:string;currency:string;price:number;changePercent:number|null}|null>=Array(symbols.length).fill(null);
    let cursor=0;
    await Promise.all(Array.from({length:Math.min(6,symbols.length)},async()=>{
      while(cursor<symbols.length){
        const index=cursor++;
        try{
          const chart=await getChart(symbols[index],'1d');
          quotes[index]={symbol:symbols[index],currency:chart.currency,price:chart.quote.price,changePercent:chart.quote.changePercent};
        }catch{/* One unavailable quote should not block the rest of the day. */}
      }
    }));
    return publicJson(quotes.filter((quote):quote is NonNullable<typeof quote>=>quote!==null),20);
  }catch(error){return failure(error);}
}
