import type {Metadata} from 'next';
import {PublicNav,PublicFooter} from '@/components/product/nav';
import {MarketBoard} from '@/components/product/market-board';

export const metadata: Metadata = {
  title: 'Dashboard — Markets | StockWatchlist',
  description: 'Follow the S&P 500, Nasdaq and Dow Jones, then scroll through technology, finance, health care and more. No sign-in required.',
};

export default function Dashboard(){
  return <><PublicNav/><MarketBoard/><PublicFooter/></>;
}
