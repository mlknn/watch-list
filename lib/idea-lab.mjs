/** Parse ticker lists and CSV exports without confusing price/quantity columns with symbols. */
export function parseImport(text,existing=[],capacity=20){
 if(typeof text!=='string'||text.length>100000)throw Error('Use a file smaller than 100 KB.');
 const csvRows=[];let cells=[],cell='',quoted=false;
 const rawText=text.replace(/^\uFEFF/,'');
 for(let i=0;i<rawText.length;i++){
  const c=rawText[i];
  if(c==='"'){if(quoted&&rawText[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
  else if(c===','&&!quoted){cells.push(cell.trim());cell='';}
  else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&rawText[i+1]==='\n')i++;cells.push(cell.trim());if(cells.some(Boolean))csvRows.push(cells);cells=[];cell='';}
  else cell+=c;
 }
 if(quoted)throw Error('Close the quoted CSV field before importing.');
 cells.push(cell.trim());if(cells.some(Boolean))csvRows.push(cells);
 const header=(csvRows[0]||[]).map(v=>v.toLowerCase());
 const column=header.findIndex(v=>['symbol','ticker','company / ticker'].includes(v));
 const tokens=column>=0?csvRows.slice(1).map(row=>row[column]||''):rawText.split(/[,;\r\n]+/).filter(part=>!part.trim().startsWith('###')).flatMap(part=>part.split(/\s+/));
 const seen=new Set(existing.map(s=>s.toUpperCase())),rows=[];let accepted=0;
 for(const raw of tokens){
  if(!raw.trim())continue;
  let symbol=raw.trim().replace(/^"|"$/g,'').toUpperCase(),reason='';
  if(symbol.startsWith('###'))continue;
  if(symbol.includes(':')){const [exchange,ticker,...extra]=symbol.split(':');const suffix={NASDAQ:'',NYSE:'',AMEX:'',NYSEARCA:'',ARCA:'',TSX:'.TO',TSXV:'.V',XETR:'.DE',BIST:'.IS'}[exchange];if(suffix===undefined||extra.length)reason='Unsupported exchange prefix';else symbol=ticker+suffix;}
  if(!reason&&!/^[A-Z][A-Z0-9.^=-]{0,19}$/.test(symbol))reason='Invalid ticker';
  if(!reason&&seen.has(symbol))reason='Already listed or duplicate';
  if(!reason&&accepted>=capacity)reason='Watchlist limit reached';
  if(!reason){seen.add(symbol);accepted++;}
  rows.push({symbol,reason});
  if(rows.length>200)throw Error('Import up to 200 rows at a time.');
 }
 return rows;
}
/** Fixed hypothetical capital, equal-weight or actual share weights. No trades are made. */
export function scenario(stocks,budget,shocks={},mode='equal'){
 if(!Number.isFinite(budget)||budget<=0)throw Error('Enter a positive scenario budget.');
 if(!stocks.length)throw Error('Add stocks to run a scenario.');
 if(new Set(stocks.map(s=>s.currency)).size!==1)throw Error('Use one quote currency per scenario.');
 const weights=stocks.map(s=>{
  if(!Number.isFinite(s.currentPrice)||s.currentPrice<=0)throw Error('A usable price is required for every stock.');
  if(mode==='holdings'&&(!Number.isFinite(s.quantity)||s.quantity<=0))throw Error('Add share quantities for every stock to use holding weights.');
  return mode==='holdings'?s.quantity*s.currentPrice:1;
 });
 const total=weights.reduce((a,b)=>a+b,0);
 const rows=stocks.map((stock,i)=>{const shock=Number(shocks[stock.symbol]??0);if(!Number.isFinite(shock)||shock< -100||shock>1000)throw Error('Scenario changes must be between -100% and 1000%.');const capital=budget*weights[i]/total;return {symbol:stock.symbol,weight:weights[i]/total,capital,shock,impact:capital*shock/100};});
 const impact=rows.reduce((sum,row)=>sum+row.impact,0);
 return {rows,impact,end:budget+impact,change:impact/budget*100,currency:stocks[0].currency};
}
/** Compare common daily price samples only; do not align different trading sessions by array index. */
export function benchmarkRace(stockChart,benchmarkChart,addedAt){
 if(stockChart.currency!==benchmarkChart.currency)throw Error('Choose a benchmark in the same quote currency.');
 const start=Date.parse(addedAt);if(!Number.isFinite(start))throw Error('The starting date is unavailable.');
 const valid=chart=>chart.points.filter(p=>Number.isFinite(p.time)&&Number.isFinite(p.price)&&p.price>0).sort((a,b)=>a.time-b.time);
 const a=valid(stockChart),b=valid(benchmarkChart);
 if(!a.length||!b.length)throw Error('Historical prices are unavailable.');
 const day=t=>new Date(t).toISOString().slice(0,10),startDay=day(start);
 if(startDay<day(a[0].time)||startDay<day(b[0].time))throw Error('The starting date is outside the available history.');
 const map=new Map(b.map(p=>[day(p.time),p]));
 const pairs=a.filter(p=>day(p.time)>=startDay&&map.has(day(p.time))).map(p=>({day:day(p.time),stock:p.price,benchmark:map.get(day(p.time)).price}));
 if(pairs.length<2)throw Error('Two common trading days are needed for this comparison.');
 const first=pairs[0],last=pairs.at(-1),stockReturn=(last.stock/first.stock-1)*100,benchmarkReturn=(last.benchmark/first.benchmark-1)*100;
 return {start:first.day,end:last.day,stockReturn,benchmarkReturn,excess:stockReturn-benchmarkReturn,points:pairs.map(p=>({day:p.day,stock:100*p.stock/first.stock,benchmark:100*p.benchmark/first.benchmark}))};
}
export function makeCheckpoint({stock,thesis,invalidation,reviewDate},now=new Date()){
 if(!stock||!Number.isFinite(stock.currentPrice)||stock.currentPrice<=0)throw Error('A usable stock price is required.');
 if(!thesis?.trim()||!invalidation?.trim())throw Error('Write your thesis and what would change your mind.');
 if(thesis.length>500||invalidation.length>500)throw Error('Keep each note under 500 characters.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(reviewDate)||!Number.isFinite(Date.parse(reviewDate))||new Date(reviewDate).toISOString().slice(0,10)!==reviewDate||reviewDate<now.toISOString().slice(0,10))throw Error('Choose today or a future review date.');
 return {id:crypto.randomUUID(),symbol:stock.symbol,currency:stock.currency,price:stock.currentPrice,quoteTime:stock.quoteTime,createdAt:now.toISOString(),thesis:thesis.trim(),invalidation:invalidation.trim(),reviewDate};
}
