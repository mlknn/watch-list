import {isoDay,todayInMarket} from './next-earnings.mjs';

export function yahooNewsLink(url){
  try{
    const parsed=new URL(String(url||''));
    if(parsed.protocol!=='https:')return '';
    if(parsed.hostname!=='finance.yahoo.com'&&!parsed.hostname.endsWith('.yahoo.com'))return '';
    return parsed.toString();
  }catch{
    return '';
  }
}

function publishTime(value){
  if(value instanceof Date)return value.getTime();
  if(typeof value==='number'&&Number.isFinite(value))return value<1e12?value*1000:value;
  const parsed=Date.parse(value||'');
  return Number.isFinite(parsed)?parsed:NaN;
}

function nyDay(value){
  return new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(value);
}

export function newsMentionsSymbol(row,symbol){
  const tickers=(row?.relatedTickers||[]).map(item=>String(item||'').toUpperCase());
  if(!tickers.length)return true;
  const upper=String(symbol||'').toUpperCase();
  const base=upper.replace(/-USD$/,'');
  return tickers.some(ticker=>ticker===upper||ticker===base);
}

export function normalizeNews(rows,now=Date.now(),maxAgeHours=72,symbol=''){
  const items=[];
  for(const row of rows||[]){
    if(symbol&&!newsMentionsSymbol(row,symbol))continue;
    const title=String(row.title||'').replace(/\s+/g,' ').trim();
    const link=yahooNewsLink(row.link);
    if(!title||!link)continue;
    const time=publishTime(row.providerPublishTime);
    if(!Number.isFinite(time))continue;
    const ageHours=(now-time)/3600000;
    if(ageHours>maxAgeHours||ageHours<-1)continue;
    items.push({
      title:title.slice(0,180),
      publisher:String(row.publisher||'Yahoo Finance').replace(/\s+/g,' ').trim().slice(0,60)||'Yahoo Finance',
      link,
      publishedAt:new Date(time).toISOString(),
      sameDay:nyDay(time)===nyDay(now),
    });
  }
  const seen=new Set();
  return items.filter(item=>{
    const key=item.title.toLowerCase();
    if(seen.has(key))return false;
    seen.add(key);
    return true;
  }).sort((a,b)=>{
    const score=(item)=> (item.sameDay?2:0)+(/\b(up|down|rise|rises|rose|falls|fell|slide|slides|drop|drops|jump|jumps|beat|miss|earnings|outlook|cut|hike|downgrade|upgrade|profit|loss|soar|plung|rally|selloff|rate)\b/i.test(item.title)?3:0);
    return score(b)-score(a)||Date.parse(b.publishedAt)-Date.parse(a.publishedAt);
  }).slice(0,2);
}

function near(value,target,ratio){
  return Number.isFinite(value)&&Number.isFinite(target)&&target>0&&Math.abs(value-target)/target<=ratio;
}

export function dailyMove(chart,extras={},now=Date.now()){
  const quote=chart?.quote||{};
  const name=chart?.companyName||chart?.symbol||'';
  const pct=typeof quote.changePercent==='number'&&Number.isFinite(quote.changePercent)?quote.changePercent:null;
  const lines=[];
  if(!name||pct===null)return {direction:'flat',lines};
  const abs=Math.abs(pct).toFixed(2);
  const direction=Math.abs(pct)<0.05?'flat':pct>0?'up':'down';
  if(direction==='up')lines.push({key:'{name} is up {pct}% today versus the previous close.',vars:{name,pct:abs}});
  else if(direction==='down')lines.push({key:'{name} is down {pct}% today versus the previous close.',vars:{name,pct:abs}});
  else lines.push({key:'{name} is little changed today versus the previous close.',vars:{name}});

  const price=quote.price,open=quote.open,prior=quote.previousClose;
  if(Number.isFinite(price)&&Number.isFinite(open)&&open>0&&Math.abs(price-open)/open>=0.0015){
    if(Number.isFinite(prior)&&prior>0){
      if(open>=prior&&price>=open)lines.push({key:'It opened higher and is still above the open.',vars:{}});
      else if(open>=prior&&price<open)lines.push({key:'It opened higher, then faded below the open.',vars:{}});
      else if(open<prior&&price<=open)lines.push({key:'It opened lower and is still below the open.',vars:{}});
      else if(open<prior&&price>open)lines.push({key:'It opened lower, then recovered above the open.',vars:{}});
    }else{
      lines.push({key:price>open?'It is trading above the open.':'It is trading below the open.',vars:{}});
    }
  }

  const low=quote.dayLow,high=quote.dayHigh,span=Number.isFinite(low)&&Number.isFinite(high)?high-low:0;
  if(span>0&&Number.isFinite(price)){
    if((high-price)/span<=0.15)lines.push({key:'It is near the session high.',vars:{}});
    else if((price-low)/span<=0.15)lines.push({key:'It is near the session low.',vars:{}});
  }
  if(near(price,quote.fiftyTwoWeekHigh,0.03))lines.push({key:'Price is near the 52-week high.',vars:{}});
  else if(near(price,quote.fiftyTwoWeekLow,0.03))lines.push({key:'Price is near the 52-week low.',vars:{}});
  if(isoDay(extras.earningsDate)===todayInMarket(new Date(now)))lines.push({key:'Earnings are scheduled today.',vars:{}});
  return {direction,lines};
}
