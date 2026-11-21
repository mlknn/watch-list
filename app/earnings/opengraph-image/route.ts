import {earningsShareImage,earningsWeekShareImage} from '@/lib/page-share-image';
import {earningsWeek} from '@/server/earnings-calendar.mjs';
import {earningsWeekCard} from '@/lib/next-earnings.mjs';

export const dynamic='force-dynamic';

// Metadata image functions receive params, not searchParams. Use a route
// handler so dated share links can read the query string from the request.
export async function GET(request:Request){
  const week=new URL(request.url).searchParams.get('week');
  const card=earningsWeekCard(week||'');
  if(!card)return earningsShareImage();
  let rows:{symbol:string;label:string;date:string}[]=[];
  try{
    const board=await earningsWeek(card.monday);
    rows=board.days.flatMap((day:{date:string;companies:{symbol:string;when:string;reported:boolean}[]})=>day.companies
      .filter(company=>!company.reported)
      .map(company=>({symbol:company.symbol,date:day.date,label:`${day.date.slice(5)} · ${company.when==='bmo'?'BMO':company.when==='amc'?'AMC':company.when==='during'?'During':'Time n/a'}`})));
  }catch{/* Still produce a useful dated share card if the calendar provider is unavailable. */}
  return earningsWeekShareImage({title:card.title,rows,weekRange:card.range});
}
