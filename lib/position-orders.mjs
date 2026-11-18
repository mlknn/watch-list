/** Existing positions become order 1 without changing their purchase details. */
export function positionOrders(stock) {
  if (stock.orders?.length) return stock.orders;
  return stock.quantity > 0 && stock.costPerShare > 0
    ? [{id:1,quantity:stock.quantity,costPerShare:stock.costPerShare,acquiredAt:stock.acquiredAt,notes:stock.notes||''}]
    : [];
}
export function withOrderTotals(stock) {
  const orders=positionOrders(stock);
  if(!orders.length)return {...stock,orders};
  const quantity=orders.reduce((sum,order)=>sum+order.quantity,0);
  const cost=orders.reduce((sum,order)=>sum+order.quantity*order.costPerShare,0);
  return {...stock,orders,quantity,costPerShare:cost/quantity,acquiredAt:orders.reduce((date,order)=>order.acquiredAt<date?order.acquiredAt:date,orders[0].acquiredAt)};
}
export function purchaseOrder(input,defaultCost) {
  const quantity=Number(input.quantity),costPerShare=Number(input.costPerShare??defaultCost);
  if(!Number.isFinite(quantity)||quantity<=0||quantity>1e9||!Number.isFinite(costPerShare)||costPerShare<=0||costPerShare>1e9)throw new Error('Enter a positive share quantity and cost per share.');
  const date=new Date(input.acquiredAt||Date.now());
  if(!Number.isFinite(date.getTime())||date>new Date()||date.getTime()<0)throw new Error('Enter a valid purchase date, no later than today.');
  const notes=String(input.notes||'');
  if(notes.length>500)throw new Error('Keep notes under 500 characters.');
  return {quantity,costPerShare,acquiredAt:date.toISOString(),notes};
}
export function appendOrder(stock,input,defaultCost) {
  const orders=positionOrders(stock);
  const order=purchaseOrder(input,defaultCost);
  return withOrderTotals({...stock,orders:[...orders,{...order,id:Math.max(0,...orders.map(o=>o.id))+1}]});
}
