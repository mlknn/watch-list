import type {Metadata} from 'next';
import {Welcome} from '@/components/product/welcome';

export const metadata: Metadata = {
  title: {absolute: 'StockWatchlist — Watchlists, markets, and earnings'},
  description: 'Track your stock ideas, explore global markets, and see who reports earnings next. No account needed to start. US, Europe, Canada, and Turkey.',
  alternates: {canonical: 'https://stockwatchlist.app/'},
  robots: {index: true, follow: true},
  openGraph: {url: 'https://stockwatchlist.app/'},
};

export default function Home(){
  return <Welcome/>;
}
