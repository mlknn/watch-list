export function priceDigits(value){
  const abs=Math.abs(value);
  if(!Number.isFinite(abs)||abs===0)return 2;
  if(abs<0.0001)return 8;
  if(abs<0.01)return 6;
  if(abs<1)return 4;
  return 2;
}

export function formatMoney(value,currency,unit='currency'){
  const digits=priceDigits(value);
  if(unit==='points')return `${value.toLocaleString(undefined,{minimumFractionDigits:digits,maximumFractionDigits:digits})}`;
  if(!/^[A-Z]{3}$/.test(currency||''))return `${Number(value).toFixed(digits)} ${currency||''}`.trim();
  return new Intl.NumberFormat(undefined,{style:'currency',currency,minimumFractionDigits:Math.min(2,digits),maximumFractionDigits:digits}).format(value);
}
