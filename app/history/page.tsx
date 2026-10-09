import type {Metadata} from 'next';
import {PublicNav,PublicFooter} from '@/components/product/nav';
import {MarketHistoryPage} from '@/components/product/market-history-page';

export const metadata:Metadata={
  title:'Market History | StockWatchlist',
  description:'See how today’s 100 largest US companies have changed since the start of this year or 1, 2, 5, or 10 years ago.',
  alternates:{canonical:'https://stockwatchlist.app/history'},
  openGraph:{url:'https://stockwatchlist.app/history',title:'Market History | StockWatchlist',description:'Compare current market leaders with their historical prices.'},
};

export default function History(){return <><PublicNav/><MarketHistoryPage/><PublicFooter/></>;}
