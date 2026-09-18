import type {Metadata} from 'next';
import {Suspense} from 'react';
import {PublicNav,PublicFooter} from '@/components/product/nav';
import {MarketBoard} from '@/components/product/market-board';

export const metadata: Metadata = {
  title: 'Dashboard — Markets | StockWatchlist',
  description: 'US, Europe, Canada, and Turkey markets. Search stocks and ETFs, read indexes, and open charts and company details.',
  alternates: {canonical: 'https://stockwatchlist.app/dashboard'},
};

export default function Dashboard(){
  return <><PublicNav/><Suspense fallback={<main className="market-page"><p>Loading markets…</p></main>}><MarketBoard/></Suspense><PublicFooter/></>;
}
