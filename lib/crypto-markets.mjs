export function cryptoCode(symbol){
  return String(symbol||'').toUpperCase().replace(/-USD$/,'');
}

export function cryptoSymbolParam(value,symbols){
  const list=(symbols||[]).map(item=>String(item).toUpperCase());
  const fallback=list[0]||'BTC-USD';
  const raw=String(value||'').trim().toUpperCase();
  if(!raw)return fallback;
  if(list.includes(raw))return raw;
  const full=raw.endsWith('-USD')?raw:`${raw}-USD`;
  return list.includes(full)?full:fallback;
}

export function coinChange(row){
  const pct=row?.chart?.quote?.changePercent;
  return typeof pct==='number'&&Number.isFinite(pct)?pct:null;
}

export function filterCoins(rows,mode){
  return (rows||[]).filter(row=>{
    const pct=coinChange(row);
    if(mode==='gainers')return pct!==null&&pct>0;
    if(mode==='losers')return pct!==null&&pct<0;
    return true;
  });
}

export function sortCoins(rows,key){
  const copy=[...(rows||[])];
  copy.sort((a,b)=>{
    if(key==='price'){
      const av=a?.chart?.quote?.price;
      const bv=b?.chart?.quote?.price;
      if(typeof av!=='number'&&typeof bv!=='number')return 0;
      if(typeof av!=='number')return 1;
      if(typeof bv!=='number')return -1;
      return bv-av;
    }
    const av=coinChange(a);
    const bv=coinChange(b);
    if(av===null&&bv===null)return 0;
    if(av===null)return 1;
    if(bv===null)return -1;
    return bv-av;
  });
  return copy;
}
