/** Rebuild a value path that grows only with holding price changes, not with stocks added at cost. */
export function capitalAdjustedPortfolioPoints(points){
  const rows=(points||[]).filter(p=>Number.isFinite(p.value)&&Number.isFinite(p.cost));
  if(!rows.length)return [];
  const start=rows[0];
  const out=[{time:start.time,value:start.value,cost:start.cost,gain:start.value-start.cost}];
  for(let i=1;i<rows.length;i++){
    const prev=rows[i-1],cur=rows[i],contribution=cur.cost-prev.cost;
    const profit=cur.value-prev.value-contribution;
    const ret=prev.value>0?profit/prev.value:0;
    const value=out[i-1].value*(1+ret);
    out.push({time:cur.time,value,cost:start.cost,gain:value-start.cost});
  }
  return out;
}
