import type {Watchlist} from './watchlist';

export type AllocationSlice={
  symbol:string;
  name:string;
  value:number;
  price:number;
  currency:string;
  change:number|null;
  weight:number;
};

export function watchlistAllocation(list:Pick<Watchlist,'stocks'>):{
  sizedByValue:boolean;
  total:number;
  currency:string;
  slices:AllocationSlice[];
};

declare module './watchlist-allocation.mjs' {
  export function watchlistAllocation(list:Pick<Watchlist,'stocks'>):{
    sizedByValue:boolean;
    total:number;
    currency:string;
    slices:AllocationSlice[];
  };
}
