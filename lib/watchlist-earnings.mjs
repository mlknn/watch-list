/** Validate provider calendar dates before displaying or exporting them. */
export function earningsDay(value){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}(?:$|T)/.test(value))return null;
  const day=value.slice(0,10),date=new Date(day+'T12:00:00Z');
  return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===day?day:null;
}

export function upcomingEarnings(rows,today){
  const seen=new Set();
  return rows.flatMap(row=>{
    const date=earningsDay(row.date);
    if(!date||date<today||seen.has(row.symbol))return [];
    seen.add(row.symbol);
    return [{...row,date}];
  }).sort((a,b)=>a.date.localeCompare(b.date)||a.symbol.localeCompare(b.symbol));
}

const escapeText=value=>String(value).replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
// RFC 5545 limits content lines to 75 UTF-8 octets, including continuation space.
function fold(line){
  const encoder=new TextEncoder();let result='',size=0;
  for(const char of line){const bytes=encoder.encode(char).length;if(size+bytes>75){result+='\r\n ';size=1;}result+=char;size+=bytes;}
  return result;
}

/** One all-day estimated event, with a reminder one day before. No invented report time. */
export function earningsCalendarFile({symbol,date,companyName},now=new Date()){
  const day=earningsDay(date);
  if(!day||!symbol||!/^[A-Z0-9.^=-]{1,32}$/i.test(symbol))throw new Error('Invalid earnings event.');
  const end=new Date(day+'T12:00:00Z');end.setUTCDate(end.getUTCDate()+1);
  const compact=value=>value.replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//StockWatchlist//Earnings//EN','CALSCALE:GREGORIAN','BEGIN:VEVENT',
    `UID:${encodeURIComponent(symbol)}-${day}@stockwatchlist.app`,`DTSTAMP:${compact(now.toISOString())}`,
    `DTSTART;VALUE=DATE:${day.replace(/-/g,'')}`,`DTEND;VALUE=DATE:${end.toISOString().slice(0,10).replace(/-/g,'')}`,
    `SUMMARY:${escapeText(symbol+' earnings (estimated)')}`,
    `DESCRIPTION:${escapeText((companyName||symbol)+': estimated earnings date from Yahoo Finance. Date may change. This calendar file does not update automatically. Check StockWatchlist before the event.')}`,
    `URL:https://stockwatchlist.app/stocks/${encodeURIComponent(symbol)}`,'STATUS:TENTATIVE','TRANSP:TRANSPARENT',
    'BEGIN:VALARM','TRIGGER:-P1D','ACTION:DISPLAY',`DESCRIPTION:${escapeText(symbol+' earnings expected tomorrow. Check the latest date.')}`,
    'END:VALARM','END:VEVENT','END:VCALENDAR',''].map(fold).join('\r\n');
}
