import {addDays} from './next-earnings.mjs';

export const PREFETCH_NEXT=3;
export const PREFETCH_PREV=1;

/** Nearby Mondays to warm while a member is on a week. Next weeks stay first. */
export function weeksToPrefetch(monday,{prev=PREFETCH_PREV,next=PREFETCH_NEXT,minWeek='',maxWeek=''}={}){
  const out=[];
  if(!monday)return out;
  for(let i=1;i<=next;i++){
    const week=addDays(monday,i*7);
    if(!week||(maxWeek&&week>maxWeek))continue;
    out.push(week);
  }
  for(let i=1;i<=prev;i++){
    const week=addDays(monday,-i*7);
    if(!week||(minWeek&&week<minWeek))continue;
    out.push(week);
  }
  return out;
}
