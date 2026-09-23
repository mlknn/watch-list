/** Holding weights for a watchlist donut. Uses costed shares when every name has them. */

export function watchlistAllocation(list){
  const stocks=(list?.stocks||[]).filter(stock=>Number.isFinite(stock.currentPrice)&&stock.currentPrice>0);
  const valued=stocks.filter(stock=>stock.quantity!==null&&stock.quantity>0);
  const useValue=valued.length>0&&valued.length===stocks.length;
  const rows=(useValue?valued:stocks).map(stock=>{
    const value=useValue?stock.quantity*stock.currentPrice:1;
    const change=stock.addedPrice>0?(stock.currentPrice/stock.addedPrice-1)*100:null;
    return {
      symbol:stock.symbol,
      name:stock.companyName||stock.symbol,
      value,
      price:stock.currentPrice,
      currency:stock.currency,
      change,
    };
  });
  const total=rows.reduce((sum,row)=>sum+row.value,0);
  return {
    sizedByValue:useValue,
    total,
    currency:rows[0]?.currency||'USD',
    slices:rows.map(row=>({...row,weight:total>0?row.value/total:0})).sort((a,b)=>b.weight-a.weight),
  };
}
