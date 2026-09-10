/** @type {Record<string,string>} */
export const RANGE_LABEL={ '1d':'1D','5d':'5D','1mo':'1M','3mo':'3M','6mo':'6M',ytd:'YTD','1y':'1Y','5y':'5Y',max:'Max'};
export function rangeLabel(range){return RANGE_LABEL[range]||String(range||'');}

export function chartPeriodStats(chart){
  const quote=chart?.quote||{};
  const points=(chart?.points||[]).filter(p=>Number.isFinite(p.price));
  const last=points.at(-1)?.price??(Number.isFinite(quote.price)?quote.price:null);
  const base=chart?.range==='1d'
    ?(Number.isFinite(quote.previousClose)?quote.previousClose:points[0]?.price)
    :points[0]?.price;
  if(typeof base==='number'&&base>0&&typeof last==='number'){
    const change=last-base;
    return {base,last,change,changePercent:(change/base)*100,up:change>=0};
  }
  const fallback=Number.isFinite(quote.changePercent)?quote.changePercent:null;
  return {base:null,last,change:Number.isFinite(quote.change)?quote.change:null,changePercent:fallback,up:(fallback??0)>=0};
}

export function seriesPeriodStats(points,key='value'){
  const rows=(points||[]).filter(p=>Number.isFinite(p[key]));
  const first=rows[0]?.[key],last=rows.at(-1)?.[key];
  if(!(typeof first==='number'&&first>0)||typeof last!=='number')return {change:null,changePercent:null,up:true};
  const change=last-first;
  return {change,changePercent:(change/first)*100,up:change>=0};
}
