import type {Metadata} from 'next';
import {WatchlistWorkspace} from '@/components/product/watchlist-workspace';

export const metadata: Metadata = {
  title: 'Watchlists | StockWatchlist',
  description: 'Add a ticker and freeze the add-day price. Optional shares and cost. Lists lock to USD, EUR, CAD, or TRY. No account needed to start.',
  alternates: {canonical: 'https://stockwatchlist.app/watchlists'},
  openGraph: {
    url: 'https://stockwatchlist.app/watchlists',
    title: 'Watchlists | StockWatchlist',
    description: 'Add a ticker and freeze the add-day price. Optional shares and cost. Lists lock to USD, EUR, CAD, or TRY. No account needed to start.',
    images: [{url: '/watchlists/opengraph-image', width: 1200, height: 630, alt: 'Watchlists on StockWatchlist — freeze the add-day price'}],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Watchlists | StockWatchlist',
    description: 'Add a ticker and freeze the add-day price. Optional shares and cost. Lists lock to USD, EUR, CAD, or TRY. No account needed to start.',
    images: ['/watchlists/opengraph-image'],
  },
};

export default function Watchlists(){return <WatchlistWorkspace/>;}
