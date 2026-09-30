/** Keep only metrics the provider actually returned. */
export function filledFacts(items){
  return (items||[]).filter(item=>item&&item.value!==null&&item.value!==undefined&&item.value!=='');
}

/** 0–1 position of the last price between the 52-week low and high. */
export function weekRangePosition(price,low,high){
  if(![price,low,high].every(n=>typeof n==='number'&&Number.isFinite(n))||!(high>low))return null;
  return Math.min(1,Math.max(0,(price-low)/(high-low)));
}

/** Net income divided by revenue, as a percent. Null when either figure is missing. */
export function netMargin(netIncome,revenue){
  if(typeof netIncome!=='number'||typeof revenue!=='number'||!Number.isFinite(netIncome)||!Number.isFinite(revenue)||revenue===0)return null;
  return (netIncome/revenue)*100;
}

/** Target versus the last price, as a percent. */
export function targetGap(target,price){
  if(typeof target!=='number'||typeof price!=='number'||!Number.isFinite(target)||!Number.isFinite(price)||price<=0)return null;
  return ((target-price)/price)*100;
}

export function websiteLabel(url){
  try{return new URL(String(url)).hostname.replace(/^www\./,'');}catch{return '';}
}
