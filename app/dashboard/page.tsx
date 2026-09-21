import type {Metadata} from 'next';
import {Suspense} from 'react';
import {PublicNav,PublicFooter} from '@/components/product/nav';
import {MarketBoard} from '@/components/product/market-board';

export const metadata: Metadata = {
  title: 'Markets | StockWatchlist',
  description: 'Markets tape for the US, Europe, Canada, global cash markets (Japan, China, India, Korea, and more), and crypto. Indexes, ETFs, gainers and losers. No account needed.',
  alternates: {canonical: 'https://stockwatchlist.app/dashboard'},
};

export default function Dashboard(){
  return <><PublicNav/><Suspense fallback={<main className="market-page"><p>Loading markets…</p></main>}><MarketBoard/></Suspense><PublicFooter/></>;
}
