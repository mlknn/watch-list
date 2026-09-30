import type {Metadata} from 'next';
import {Suspense} from 'react';
import {PublicNav,PublicFooter} from '@/components/product/nav';
import {MarketBoard} from '@/components/product/market-board';

const marketsMeta: Metadata = {
  title: 'Markets | StockWatchlist',
  description: 'Markets tape for the US, Europe, Canada, global cash markets (Japan, China, India, Korea, and more), and crypto. Indexes, ETFs, gainers and losers. No account needed.',
  alternates: {canonical: 'https://stockwatchlist.app/dashboard'},
  openGraph: {
    url: 'https://stockwatchlist.app/dashboard',
    title: 'Markets | StockWatchlist',
    description: 'Markets tape for the US, Europe, Canada, global cash markets (Japan, China, India, Korea, and more), and crypto. Indexes, ETFs, gainers and losers. No account needed.',
    images: [{url: '/dashboard/opengraph-image', width: 1200, height: 630, alt: 'Markets on StockWatchlist — indexes, ETFs, and movers'}],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Markets | StockWatchlist',
    description: 'Markets tape for the US, Europe, Canada, global cash markets (Japan, China, India, Korea, and more), and crypto. Indexes, ETFs, gainers and losers. No account needed.',
    images: ['/dashboard/opengraph-image'],
  },
};

export async function generateMetadata({searchParams}:{searchParams:Promise<{market?:string}>}):Promise<Metadata>{
  const params=await searchParams;
  if(params.market!=='crypto')return marketsMeta;
  const title='Crypto Markets — Bitcoin, Ethereum & Crypto Prices | StockWatchlist';
  const description='Track Bitcoin, Ethereum, Solana and major cryptocurrencies with current prices, 24-hour moves and charts.';
  const url='https://stockwatchlist.app/dashboard?market=crypto';
  return {
    title,
    description,
    alternates:{canonical:url},
    openGraph:{...marketsMeta.openGraph,title,description,url},
    twitter:{card:'summary_large_image',title,description,images:['/dashboard/opengraph-image']},
  };
}

export default function Dashboard(){
  return <><PublicNav/><Suspense fallback={<main className="market-page"><p>Loading markets…</p></main>}><MarketBoard/></Suspense><PublicFooter/></>;
}
