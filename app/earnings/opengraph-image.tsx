import {earningsOgAlt,earningsShareImage,earningsWeekShareImage,pageOgSize} from '@/lib/page-share-image';
import {earningsWeek} from '@/server/earnings-calendar.mjs';
import {earningsWeekCard} from '@/lib/next-earnings.mjs';

export const alt=earningsOgAlt;
export const size=pageOgSize;
export const contentType='image/png';

export default async function Image({searchParams}:{searchParams:Promise<{week?:string}>}){
  const {week}=await searchParams;
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
