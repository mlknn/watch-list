import type {Metadata} from 'next';
import {Suspense} from 'react';
import {PublicNav,PublicFooter} from '@/components/product/nav';
import {EarningsCalendar} from '@/components/product/earnings-calendar';

export const metadata: Metadata = {
  title: 'Earnings calendar | StockWatchlist',
  description: 'Upcoming and recent earnings for US-listed companies, one column per weekday. Open a ticker for the earnings story and company details.',
  alternates: {canonical: 'https://stockwatchlist.app/earnings'},
};

export default function EarningsPage(){
  return <><PublicNav/><Suspense fallback={<main className="earnings-cal-page"><p>Loading the earnings calendar…</p></main>}><EarningsCalendar/></Suspense><PublicFooter/></>;
}
