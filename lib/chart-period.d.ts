import type {MarketChart} from './market';

export const RANGE_LABEL:Record<string,string>;
export function rangeLabel(range:string):string;
export function chartPeriodStats(chart:MarketChart|{quote?:MarketChart['quote'];points?:MarketChart['points'];range?:string}):{
  base:number|null;
  last:number|null;
  change:number|null;
  changePercent:number|null;
  up:boolean;
};
export function seriesPeriodStats(points:Array<Record<string,number>>,key?:string):{
  change:number|null;
  changePercent:number|null;
  up:boolean;
};
