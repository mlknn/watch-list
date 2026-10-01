export function explorerRows(groups){
  const map=new Map();
  for(const group of groups)for(const row of group.stocks){
    if(!map.has(row.symbol)||(!map.get(row.symbol).chart&&row.chart))map.set(row.symbol,{...row,groupId:group.id,groupTitle:group.title});
  }
  return [...map.values()];
}
/** @param {any[]} rows @param {{query?:string,group?:string,direction?:string,sort?:string,favoritesOnly?:boolean,favorites?:string[]}} [options] */
export function filterMarketRows(rows,{query='',group='',direction='all',sort='change',favoritesOnly=false,favorites=[]}={}){
  const q=query.trim().toLowerCase();
  const ids=new Set(favorites);
  const value=row=>sort==='name'?(row.chart?.companyName||row.name||row.symbol).toLowerCase():sort==='volume'?row.chart?.quote.volume:sort==='price'?row.chart?.quote.price:row.chart?.quote.changePercent;
  return rows.filter(row=>{
    const change=row.chart?.quote.changePercent;
    return (!q||`${row.symbol} ${row.chart?.companyName||row.name||''}`.toLowerCase().includes(q))&&(!group||row.groupId===group)&&(!favoritesOnly||ids.has(row.symbol))&&(direction==='all'||(Number.isFinite(change)&&(direction==='up'?change>0:direction==='down'?change<0:change===0)));
  }).sort((a,b)=>{
    const av=value(a),bv=value(b);
    if(av==null)return bv==null?a.symbol.localeCompare(b.symbol):1;
    if(bv==null)return -1;
    return sort==='name'?av.localeCompare(bv):(sort==='losers'?av-bv:bv-av)||a.symbol.localeCompare(b.symbol);
  });
}

export function mergeMarketRows(previous,incoming){
  const updates=new Map(incoming.map(row=>[row.symbol,row]));
  const combined=[...previous.map(row=>updates.get(row.symbol)||row),...incoming.filter(row=>!previous.some(saved=>saved.symbol===row.symbol))];
  return combined.map(row=>{
    const saved=previous.find(item=>item.symbol===row.symbol);
    return !row.chart&&saved?.chart?{...saved,error:row.error||'Quote refresh unavailable.'}:row;
  });
}
