import type {Metadata} from 'next';
import {Welcome} from '@/components/product/welcome';

export const metadata: Metadata = {
  title: {absolute: 'StockWatchlist — Watchlists, markets, and earnings'},
  description: 'Build a what-if stock portfolio and see how your picks perform over time. No signup to start. US, Europe, Canada, and Turkey.',
  alternates: {canonical: 'https://stockwatchlist.app/'},
  robots: {index: true, follow: true},
  openGraph: {
    url: 'https://stockwatchlist.app/',
    description: 'Build a what-if stock portfolio and see how your picks perform over time. No signup to start. US, Europe, Canada, and Turkey.',
  },
};

export default function Home(){
  return <Welcome/>;
}
