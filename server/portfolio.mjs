import {getChart,CHART_RANGES} from './charts.mjs';
import {AppError} from './quotes.mjs';
export function portfolioTotals(stocks){
 const holdings=stocks.filter(s=>s.quantity>0&&s.costPerShare>0);
 if(holdings.some(s=>s.currency!=='USD'))throw new AppError('Portfolio totals currently support USD holdings only.');
 const cost=holdings.reduce((sum,s)=>sum+s.quantity*s.costPerShare,0),value=holdings.reduce((sum,s)=>sum+s.quantity*s.currentPrice,0);
 return {cost,value,gain:value-cost,gainPercent:cost?(value-cost)/cost*100:null,positions:holdings.length,incomplete:stocks.length-holdings.length};
}
export function aggregatePortfolio(stocks,charts,now=Date.now()){
 const holdings=stocks.filter(s=>s.quantity>0&&s.costPerShare>0);
 if(!holdings.length)return [];
 const start=Math.min(...holdings.map(s=>Date.parse(s.acquiredAt))),times=[...new Set(charts.flatMap(c=>c.points.map(p=>p.time)))].filter(t=>t>=start&&t<=now).sort((a,b)=>a-b);
 if(start>=Math.min(...charts.flatMap(c=>c.points.map(p=>p.time))))times.unshift(start);
 times.push(now);
 const indices=holdings.map(()=>-1),result=[];
 for(const time of new Set(times)){
  let value=0,cost=0,complete=true;
  holdings.forEach((s,i)=>{
   if(time<Date.parse(s.acquiredAt))return;
   cost+=s.quantity*s.costPerShare;const points=charts[i].points;
   while(indices[i]+1<points.length&&points[indices[i]+1].time<=time)indices[i]++;
   let price=indices[i]>=0?points[indices[i]].price:null;
   if(time===now)price=s.currentPrice;
   if(time===Date.parse(s.acquiredAt))price=s.costPerShare;
   if(price===null){complete=false;return;}value+=s.quantity*price;
  });
  if(complete)result.push({time,value,cost,gain:value-cost});
 }
 return result;
}
export async function portfolioHistory(list,range){
 if(list.mode!=='advanced')throw new AppError('Choose an advanced watchlist.');if(!['1d','1mo','3mo','1y','5y','max'].includes(range))throw new AppError('Choose a supported time range.');
 const totals=portfolioTotals(list.stocks),holdings=list.stocks.filter(s=>s.quantity>0&&s.costPerShare>0);
 const charts=Array.from({length:holdings.length});let next=0;await Promise.all(Array.from({length:Math.min(4,holdings.length)},async()=>{while(next<holdings.length){const i=next++;charts[i]=await getChart(holdings[i].symbol,range);if(charts[i].currency!=='USD'||!charts[i].points.length)throw new AppError(`Complete history is unavailable for ${holdings[i].symbol}. Try another range.`,502);}}));
 return {range,currency:'USD',totals,points:aggregatePortfolio(holdings,charts),interval:CHART_RANGES[range].interval,asOf:new Date().toISOString(),method:'Current holdings only, from their entered purchase dates. Historical closes are split-adjusted; use quantities and costs on today’s split basis. Excludes sold positions, dividends, fees and tax. Value changes can include added capital.'};
}
