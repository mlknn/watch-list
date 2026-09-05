import YahooFinance from 'yahoo-finance2';
import {normalizeTicker} from './quotes.mjs';
const yahoo=new YahooFinance({suppressNotices:['yahooSurvey'],queue:{concurrency:2},logger:{debug(){},info(){},warn(){},error(){},dir(){},log(){}}});
const cached=new Map(),pending=new Map();
const number=value=>typeof value==='number'&&Number.isFinite(value)?value:undefined;
const date=value=>{if(value==null)return undefined;const result=value instanceof Date?value:new Date(typeof value==='number'?value*1000:value);return Number.isFinite(result.getTime())?result.toISOString():undefined;};
export async function getFundamentals(value){const symbol=normalizeTicker(value);const prior=cached.get(symbol);if(prior&&Date.now()-prior.at<(prior.data.available?300000:60000))return prior.data;if(pending.has(symbol))return pending.get(symbol);
  const task=(async()=>{let data;try{
    const summary=await yahoo.quoteSummary(symbol,{modules:['price','summaryDetail','defaultKeyStatistics','financialData','assetProfile','calendarEvents']},{fetchOptions:{signal:AbortSignal.timeout(10000)}});
    const p=summary.price||{},detail=summary.summaryDetail||{},stats=summary.defaultKeyStatistics||{},financial=summary.financialData||{},profile=summary.assetProfile||{},calendar=summary.calendarEvents||{};
    data={available:true,companyName:p.longName||p.shortName,marketCap:number(p.marketCap??detail.marketCap),revenue:number(financial.totalRevenue),netIncome:number(stats.netIncomeToCommon),eps:number(stats.trailingEps),shares:number(stats.sharesOutstanding),pe:number(detail.trailingPE),forwardPe:number(detail.forwardPE),dividendRate:number(detail.dividendRate),dividendYield:number(detail.dividendYield),exDividendDate:date(calendar.exDividendDate||detail.exDividendDate),beta:number(detail.beta??stats.beta),analysts:financial.recommendationKey,targetPrice:number(financial.targetMeanPrice),earningsDate:date(calendar.earnings?.earningsDate?.[0]),postMarketPrice:number(p.postMarketPrice),postMarketTime:date(p.postMarketTime),description:profile.longBusinessSummary,sector:profile.sector,industry:profile.industry,website:profile.website,country:profile.country,employees:number(profile.fullTimeEmployees),fetchedAt:new Date().toISOString()};
  }catch{data={available:false,error:'Company statistics are temporarily unavailable from the provider.'};}
  cached.set(symbol,{at:Date.now(),data});if(cached.size>300)cached.delete(cached.keys().next().value);return data;})();pending.set(symbol,task);try{return await task;}finally{pending.delete(symbol);}
}
