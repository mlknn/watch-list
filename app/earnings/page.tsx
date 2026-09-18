import type {Metadata} from 'next';
import {Suspense} from 'react';
import {PublicNav,PublicFooter} from '@/components/product/nav';
import {EarningsCalendar} from '@/components/product/earnings-calendar';

export const metadata: Metadata = {
  title: 'US earnings calendar | StockWatchlist',
  description: 'US stock earnings this week and next, one column per weekday. See who already reported in the last two quarters, then open a ticker for details.',
  alternates: {canonical: 'https://stockwatchlist.app/earnings'},
};

export default function EarningsPage(){
  return <><PublicNav/><Suspense fallback={<main className="earnings-cal-page"><p>Loading the US earnings calendar…</p></main>}><EarningsCalendar/></Suspense><PublicFooter/></>;
}
