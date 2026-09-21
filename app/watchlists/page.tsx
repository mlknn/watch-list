import type {Metadata} from 'next';
import {WatchlistWorkspace} from '@/components/product/watchlist-workspace';

export const metadata: Metadata = {
  title: 'Watchlists | StockWatchlist',
  description: 'Add a ticker and freeze the add-day price. Optional shares and cost. Lists lock to USD, EUR, CAD, or TRY. No account needed to start.',
  alternates: {canonical: 'https://stockwatchlist.app/watchlists'},
};

export default function Watchlists(){return <WatchlistWorkspace/>;}
