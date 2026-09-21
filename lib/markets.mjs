import catalog from './market-dashboard.json' with {type:'json'};

export function listMarkets(){
  return catalog.markets;
}

export function getMarket(id){
  const key=String(id||'us').toLowerCase();
  if(key==='tr')return catalog.markets.find(item=>item.id==='global')||catalog.markets[0];
  return catalog.markets.find(item=>item.id===key)||catalog.markets[0];
}

export function groupsFor(market){
  const etfs={id:market.id+'-etfs',title:market.etfTitle||'Key ETFs',blurb:market.etfBlurb||'Major ETFs in this market.',symbols:(market.etfs||[]).map(item=>item.symbol),kind:'etfs'};
  return [etfs,...(market.groups||[])];
}

export function findGroup(id){
  for(const market of catalog.markets){
    const group=groupsFor(market).find(item=>item.id===id);
    if(group)return group;
  }
  return null;
}

export function allMarketSymbols(){
  return catalog.markets.flatMap(market=>[
    ...(market.indices||[]).map(item=>item.symbol),
    ...(market.etfs||[]).map(item=>item.symbol),
    ...(market.groups||[]).flatMap(group=>group.symbols),
  ]);
}

export function isCryptoCoin(symbol){
  return String(symbol||'').toUpperCase().endsWith('-USD');
}
