const STOCKS = [
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust' },
  { symbol: 'VOO', name: 'Vanguard S&P 500 ETF' },
  { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust ETF' },
  { symbol: 'IWM', name: 'iShares Russell 2000 ETF' },
  { symbol: 'SCHD', name: 'Schwab US Dividend Equity ETF' },
  { symbol: 'BND', name: 'Vanguard Total Bond Market ETF' },
  { symbol: 'GLD', name: 'SPDR Gold Shares ETF' },

  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'AAL', name: 'American Airlines Group' },
  { symbol: 'ABBV', name: 'AbbVie Inc.' },
  { symbol: 'ABNB', name: 'Airbnb Inc.' },
  { symbol: 'ACN', name: 'Accenture plc' },
  { symbol: 'ADBE', name: 'Adobe Inc.' },
  { symbol: 'ADI', name: 'Analog Devices' },
  { symbol: 'ADM', name: 'Archer-Daniels-Midland Company' },
  { symbol: 'ADP', name: 'Automatic Data Processing' },
  { symbol: 'ADSK', name: 'Autodesk Inc.' },
  { symbol: 'AIG', name: 'American International Group' },
  { symbol: 'AMAT', name: 'Applied Materials' },
  { symbol: 'AMD', name: 'Advanced Micro Devices' },
  { symbol: 'AMGN', name: 'Amgen Inc.' },
  { symbol: 'AMZN', name: 'Amazon.com' },
  { symbol: 'AVGO', name: 'Broadcom Inc.' },
  { symbol: 'AXP', name: 'American Express Company' },
  { symbol: 'BA', name: 'The Boeing Company' },
  { symbol: 'BAC', name: 'Bank of America Corporation' },
  { symbol: 'BBWI', name: 'Bath & Body Works' },
  { symbol: 'BMY', name: 'Bristol-Myers Squibb' },
  { symbol: 'BRK-B', name: 'Berkshire Hathaway' },
  { symbol: 'C', name: 'Citigroup Inc.' },
  { symbol: 'CAT', name: 'Caterpillar Inc.' },
  { symbol: 'CCI', name: 'Crown Castle Inc.' },
  { symbol: 'CL', name: 'Colgate-Palmolive Company' },
  { symbol: 'CMCSA', name: 'Comcast Corporation' },
  { symbol: 'COST', name: 'Costco Wholesale Corporation' },
  { symbol: 'CRM', name: 'Salesforce Inc.' },
  { symbol: 'CSCO', name: 'Cisco Systems' },
  { symbol: 'CVX', name: 'Chevron Corporation' },
  { symbol: 'D', name: 'Dominion Energy' },
  { symbol: 'DAL', name: 'Delta Air Lines' },
  { symbol: 'DE', name: 'Deere & Company' },
  { symbol: 'DELL', name: 'Dell Technologies' },
  { symbol: 'DIS', name: 'The Walt Disney Company' },
  { symbol: 'DOW', name: 'Dow Inc.' },
  { symbol: 'DXCM', name: 'DexCom Inc.' },
  { symbol: 'EA', name: 'Electronic Arts' },
  { symbol: 'ELV', name: 'Elevance Health' },
  { symbol: 'EOG', name: 'EOG Resources' },
  { symbol: 'F', name: 'Ford Motor Company' },
  { symbol: 'FDX', name: 'FedEx Corporation' },
  { symbol: 'GD', name: 'General Dynamics' },
  { symbol: 'GILD', name: 'Gilead Sciences' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'GS', name: 'Goldman Sachs Group' },
  { symbol: 'HD', name: 'Home Depot' },
  { symbol: 'HON', name: 'Honeywell International' },
  { symbol: 'IBM', name: 'International Business Machines' },
  { symbol: 'ICE', name: 'Intercontinental Exchange' },
  { symbol: 'INTC', name: 'Intel Corporation' },
  { symbol: 'INTU', name: 'Intuit Inc.' },
  { symbol: 'ISRG', name: 'Intuitive Surgical' },
  { symbol: 'JNJ', name: 'Johnson & Johnson' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.' },
  { symbol: 'KHC', name: 'Kraft Heinz Company' },
  { symbol: 'KO', name: 'Coca-Cola Company' },
  { symbol: 'LLY', name: 'Eli Lilly and Company' },
  { symbol: 'LMT', name: 'Lockheed Martin' },
  { symbol: 'LOW', name: 'Lowe\'s Companies' },
  { symbol: 'MA', name: 'Mastercard Incorporated' },
  { symbol: 'MCD', name: 'McDonald\'s Corporation' },
  { symbol: 'META', name: 'Meta Platforms' },
  { symbol: 'MMM', name: '3M Company' },
  { symbol: 'MO', name: 'Altria Group' },
  { symbol: 'MRK', name: 'Merck & Co.' },
  { symbol: 'MS', name: 'Morgan Stanley' },
  { symbol: 'MSFT', name: 'Microsoft Corporation' },
  { symbol: 'NEE', name: 'NextEra Energy' },
  { symbol: 'NKE', name: 'Nike Inc.' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation' },
  { symbol: 'ORCL', name: 'Oracle Corporation' },
  { symbol: 'PFE', name: 'Pfizer Inc.' },
  { symbol: 'PG', name: 'Procter & Gamble' },
  { symbol: 'PM', name: 'Philip Morris International' },
  { symbol: 'PYPL', name: 'PayPal Holdings' },
  { symbol: 'QCOM', name: 'QUALCOMM Incorporated' },
  { symbol: 'RTX', name: 'RTX Corporation' },
  { symbol: 'SBUX', name: 'Starbucks Corporation' },
  { symbol: 'SCHW', name: 'Charles Schwab Corporation' },
  { symbol: 'SHOP', name: 'Shopify Inc.' },
  { symbol: 'SLB', name: 'Schlumberger' },
  { symbol: 'SO', name: 'Southern Company' },
  { symbol: 'SPG', name: 'Simon Property Group' },
  { symbol: 'T', name: 'AT&T Inc.' },
  { symbol: 'TGT', name: 'Target Corporation' },
  { symbol: 'TMUS', name: 'T-Mobile US' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
  { symbol: 'TXN', name: 'Texas Instruments' },
  { symbol: 'UBER', name: 'Uber Technologies' },
  { symbol: 'UNH', name: 'UnitedHealth Group' },
  { symbol: 'UPS', name: 'United Parcel Service' },
  { symbol: 'USB', name: 'U.S. Bancorp' },
  { symbol: 'V', name: 'Visa Inc.' },
  { symbol: 'VRTX', name: 'Vertex Pharmaceuticals' },
  { symbol: 'WBA', name: 'Walgreens Boots Alliance' },
  { symbol: 'WMT', name: 'Walmart Inc.' },
  { symbol: 'XOM', name: 'Exxon Mobil Corporation' }
];

const normalize = value => String(value||'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function rankStockSuggestions(query,items,limit=8){
 const needle=normalize(query);if(!needle)return [];
 const unique=new Map();for(const item of items)if(item&&typeof item.symbol==='string'&&typeof item.name==='string'&&!unique.has(item.symbol))unique.set(item.symbol,item);
 return [...unique.values()].map(stock=>{const symbol=normalize(stock.symbol),name=normalize(stock.name);const score=symbol===needle?1000:name===needle?950:name.startsWith(needle)?800:symbol.startsWith(needle)?750:stock.name.toLowerCase().split(/[^a-z0-9]+/).some(t=>t.startsWith(needle))?500:symbol.includes(needle)||name.includes(needle)?200:0;return {stock,score};}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,Math.min(12,Math.max(1,Number(limit)||8))).map(x=>x.stock);
}
export function getTickerSuggestions(query,limit=8){return rankStockSuggestions(query,STOCKS,limit);}
export async function searchTickerSuggestions(query,limit=8,signal){
 const text=String(query||'').trim();if(!text)return [];
 const local=getTickerSuggestions(text,limit);
 if(typeof window!=='undefined')try{const r=await fetch(`/api/stocks/search?q=${encodeURIComponent(text)}&limit=${limit}`,{signal});if(r.ok){const data=await r.json();return rankStockSuggestions(text,[...local,...(Array.isArray(data)?data:[])],limit);}}catch(e){if(signal?.aborted)throw e;}
 return local;
}
export async function resolveStockInput(query){
 const text=String(query||'').trim();const suggestions=await searchTickerSuggestions(text,12);
 const exact=suggestions.find(s=>s.symbol.toUpperCase()===text.toUpperCase());if(exact)return exact.symbol;
 const company=normalize(text),base=normalize(text.replace(/\b(incorporated|inc|corporation|corp|limited|ltd|plc)\.?$/i,'').trim());const matches=suggestions.filter(s=>normalize(s.name)===company||normalize(s.name.replace(/\b(incorporated|inc|corporation|corp|limited|ltd|plc)\.?$/i,'').trim())===base);
 if(matches.length)return matches[0].symbol;
 if(/^[A-Za-z0-9^][A-Za-z0-9.^=-]{0,24}$/.test(text))return text.toUpperCase();
 throw new Error('Choose a company from the suggestions so we can use its exact ticker.');
}
