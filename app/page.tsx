import type {Metadata} from 'next';
import {Welcome} from '@/components/product/welcome';

export const metadata: Metadata = {
  title: {absolute: 'StockWatchlist — Watchlists, markets, and earnings'},
  description: 'Watchlists, Markets, and an earnings calendar. What-if portfolios for US, Europe, Canada, and Turkey. No signup to start.',
  alternates: {canonical: 'https://stockwatchlist.app/'},
  robots: {index: true, follow: true},
  openGraph: {
    url: 'https://stockwatchlist.app/',
    description: 'Watchlists, Markets, and an earnings calendar. What-if portfolios for US, Europe, Canada, and Turkey. No signup to start.',
  },
};

export default function Home(){
  return <Welcome/>;
}
