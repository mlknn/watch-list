/** Position in the reported 52-week range; missing and flat ranges stay unknown. */
export function rangePosition(quote){
  const {price,fiftyTwoWeekLow:low,fiftyTwoWeekHigh:high}=quote||{};
  if(![price,low,high].every(Number.isFinite)||high<=low)return null;
  return Math.max(0,Math.min(100,100*(price-low)/(high-low)));
}
export const emptyScan={minPrice:'',maxPrice:'',minChange:'',maxChange:'',minVolume:'',range:'',currency:''};
export const scanPresets=[
  {id:'all',label:'All stocks',values:{}},
  {id:'gainers',label:'Up 2% or more',values:{minChange:'2'}},
  {id:'losers',label:'Down 2% or more',values:{maxChange:'-2'}},
  {id:'active',label:'Volume 1M+',values:{minVolume:'1000000'}},
  {id:'high',label:'Near 52-week high',values:{range:'high'}},
  {id:'low',label:'Near 52-week low',values:{range:'low'}},
];
export function scanError(scan){
  for(const key of ['minPrice','maxPrice','minChange','maxChange','minVolume']){
    if(scan[key]!==''&&(!Number.isFinite(Number(scan[key]))||(['minPrice','maxPrice','minVolume'].includes(key)&&Number(scan[key])<0)))return 'Enter valid numbers. Price and volume cannot be negative.';
  }
  if(scan.minPrice!==''&&scan.maxPrice!==''&&Number(scan.minPrice)>Number(scan.maxPrice))return 'Minimum price cannot exceed maximum price.';
  if(scan.minChange!==''&&scan.maxChange!==''&&Number(scan.minChange)>Number(scan.maxChange))return 'Minimum daily change cannot exceed maximum daily change.';
  return '';
}
export function scanRows(rows,scan=emptyScan){
  if(scanError(scan))return [];
  const bounds=[['minPrice','price',1],['maxPrice','price',-1],['minChange','changePercent',1],['maxChange','changePercent',-1],['minVolume','volume',1]];
  return rows.filter(row=>{
    const q=row.chart?.quote;
    // Scans use current, available quotes; an old retained quote is never a match.
    if(!q||row.error||!Number.isFinite(q.price))return false;
    if(scan.currency&&row.chart.currency!==scan.currency)return false;
    for(const [key,field,sign] of bounds){
      if(scan[key]!==''&&(!Number.isFinite(q[field])||sign*q[field]<sign*Number(scan[key])))return false;
    }
    if(scan.range){const pos=rangePosition(q);if(pos===null||(scan.range==='high'?pos<90:pos>10))return false;}
    return true;
  });
}
