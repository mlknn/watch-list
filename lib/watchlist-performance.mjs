export function watchlistPerformance(list){
  const stocks=(list.stocks||[]).filter(s=>Number.isFinite(s.currentPrice)&&s.addedPrice>0);
  if(!stocks.length)return null;
  if(stocks.some(s=>s.currency!==stocks[0].currency))return null;
  const holdings=stocks.filter(s=>s.quantity!==null&&s.quantity>0&&s.costPerShare!==null&&s.costPerShare>0);
  if(holdings.length===stocks.length){
    const cost=holdings.reduce((n,s)=>n+s.quantity*s.costPerShare,0);
    const value=holdings.reduce((n,s)=>n+s.quantity*s.currentPrice,0);
    return cost>0?(value/cost-1)*100:null;
  }
  return (stocks.reduce((n,s)=>n+s.currentPrice/s.addedPrice,0)/stocks.length-1)*100;
}
