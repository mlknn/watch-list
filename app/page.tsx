import type {Metadata} from 'next';
import {Welcome} from '@/components/product/welcome';

export const metadata: Metadata = {
  title: {absolute: 'StockWatchlist — What if you invested in your picks today?'},
  description: 'Build a what-if stock portfolio and see how your picks perform over time. No signup to start. US, Europe, Canada, and Turkey.',
  alternates: {canonical: 'https://stockwatchlist.app/'},
  robots: {index: true, follow: true},
  openGraph: {url: 'https://stockwatchlist.app/'},
};

export default function Home(){
  return <Welcome/>;
}
