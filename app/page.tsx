import type {Metadata} from 'next';
import {Welcome} from '@/components/product/welcome';

export const metadata: Metadata = {
  title: {absolute: 'StockWatchlist — Watchlists, markets, and earnings'},
  description: 'Watchlists that freeze the add-day price, a markets tape (US, Europe, Canada, global, crypto), and a US earnings calendar. No account needed to start.',
  alternates: {canonical: 'https://stockwatchlist.app/'},
  robots: {index: true, follow: true},
  openGraph: {
    url: 'https://stockwatchlist.app/',
    title: 'StockWatchlist — Watchlists, markets, and earnings',
    description: 'Watchlists that freeze the add-day price, a markets tape (US, Europe, Canada, global, crypto), and a US earnings calendar. No account needed to start.',
    images: [{url: '/opengraph-image?v=home', width: 1200, height: 630, alt: 'StockWatchlist — watchlists, markets, and earnings'}],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StockWatchlist — Watchlists, markets, and earnings',
    description: 'Watchlists that freeze the add-day price, a markets tape (US, Europe, Canada, global, crypto), and a US earnings calendar. No account needed to start.',
    images: ['/opengraph-image?v=home'],
  },
};

export default function Home(){
  return <Welcome/>;
}
