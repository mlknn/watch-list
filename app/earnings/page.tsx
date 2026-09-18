import type {Metadata} from 'next';
import {Suspense} from 'react';
import {PublicNav,PublicFooter} from '@/components/product/nav';
import {EarningsCalendar} from '@/components/product/earnings-calendar';

export const metadata: Metadata = {
  title: 'US earnings calendar | StockWatchlist',
  description: 'US stock earnings this week, one column per day. Open a ticker for quarterly results and company details.',
  alternates: {canonical: 'https://stockwatchlist.app/earnings'},
};

export default function EarningsPage(){
  return <><PublicNav/><Suspense fallback={<main className="earnings-cal-page"><p>Loading the US earnings calendar…</p></main>}><EarningsCalendar/></Suspense><PublicFooter/></>;
}
