import {getChart,CHART_RANGES} from './charts.mjs';
import {AppError} from './quotes.mjs';
import {PORTFOLIO_CURRENCIES,listCurrency,tradingTimezone} from '../lib/portfolio-currency.mjs';
export function portfolioTotals(stocks){
 const holdings=stocks.filter(s=>s.quantity>0&&s.costPerShare>0);
 const currency=listCurrency(holdings);
 if(currency&&!PORTFOLIO_CURRENCIES.includes(currency))throw new AppError('Portfolios support US (USD), Europe (EUR), Canada (CAD), and Turkey (TRY) stocks.');
 const cost=holdings.reduce((sum,s)=>sum+s.quantity*s.costPerShare,0),value=holdings.reduce((sum,s)=>sum+s.quantity*s.currentPrice,0);
 return {cost,value,gain:value-cost,gainPercent:cost?(value-cost)/cost*100:null,positions:holdings.length,incomplete:stocks.length-holdings.length,currency};
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
export function dailyPortfolioPoints(points,timezone='America/New_York'){
 const days=new Map();
 const date=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'});
 for(const point of [...points].sort((a,b)=>a.time-b.time)){const day=date.format(point.time);days.set(day,{...point,time:Date.parse(day+'T12:00:00Z')});}
 return [...days.values()];
}
export async function portfolioHistory(list,range,now=Date.now()){
 if(list.mode!=='advanced')throw new AppError('Choose an advanced watchlist.');if(!['1d','1mo','3mo','1y','5y','max'].includes(range))throw new AppError('Choose a supported time range.');
 const totals=portfolioTotals(list.stocks),holdings=list.stocks.filter(s=>s.quantity>0&&s.costPerShare>0);
 const currency=totals.currency||listCurrency(list.stocks)||'USD';
 const zone=tradingTimezone(currency);
 const method='Current holdings only, from their entered purchase dates. The percent and solid line follow price changes, not stocks you add. Historical closes are split-adjusted; use quantities and costs on today’s split basis. Excludes sold positions, dividends, fees and tax.';
 const tradingDate=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'});
 if(!holdings.length||holdings.every(s=>Date.parse(s.acquiredAt)<=now&&tradingDate.format(Date.parse(s.acquiredAt))===tradingDate.format(now))){return {range,currency,totals,points:holdings.length?dailyPortfolioPoints([{time:now,value:totals.value,cost:totals.cost,gain:totals.gain}],zone):[],interval:'1d',asOf:new Date(now).toISOString(),method};}
 const charts=Array.from({length:holdings.length});let next=0;await Promise.all(Array.from({length:Math.min(4,holdings.length)},async()=>{while(next<holdings.length){const i=next++;charts[i]=await getChart(holdings[i].symbol,range);if(charts[i].currency!==currency||!charts[i].points.length)throw new AppError(`Complete history is unavailable for ${holdings[i].symbol}. Try another range.`,502);}}));
 return {range,currency,totals,points:dailyPortfolioPoints(aggregatePortfolio(holdings,charts,now),zone),interval:CHART_RANGES[range].interval,asOf:new Date().toISOString(),method};
}
