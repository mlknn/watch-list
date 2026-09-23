import type {Metadata} from 'next';
import {Welcome} from '@/components/product/welcome';

export const metadata: Metadata = {
  title: {absolute: 'StockWatchlist — Track stock ideas from the day you add them'},
  description: 'Track your stock ideas from the day you add them. Save a starting price on this device, then keep markets and US earnings within reach. No account needed to start.',
  alternates: {canonical: 'https://stockwatchlist.app/'},
  robots: {index: true, follow: true},
  openGraph: {
    url: 'https://stockwatchlist.app/',
    title: 'StockWatchlist — Track stock ideas from the day you add them',
    description: 'Track your stock ideas from the day you add them. Save a starting price on this device, then keep markets and US earnings within reach. No account needed to start.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StockWatchlist — Track stock ideas from the day you add them',
    description: 'Track your stock ideas from the day you add them. Save a starting price on this device, then keep markets and US earnings within reach. No account needed to start.',
  },
};

export default function Home(){
  return <Welcome/>;
}
