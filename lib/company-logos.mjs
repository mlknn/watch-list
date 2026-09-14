const ALIAS={
  'BTC-USD':'BTC',
  'ETH-USD':'ETH',
  'GC=F':'GOLD',
};

export function logoSources(symbol){
  const upper=String(symbol||'').trim().toUpperCase();
  const variants=[];
  const add=value=>{if(value&&!variants.includes(value))variants.push(value);};
  add(upper);
  add(ALIAS[upper]);
  add(upper.replace('-','.'));
  add(upper.replace('.','-'));
  if(upper.includes('-')&&!upper.endsWith('-USD'))add(upper.split('-')[0]);
  if(upper.endsWith('-USD'))add(upper.slice(0,-4));
  return variants.map(value=>'https://assets.parqet.com/logos/symbol/'+encodeURIComponent(value)+'?format=png');
}
