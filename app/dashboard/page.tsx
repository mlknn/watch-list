import type {Metadata} from 'next';
import {PublicNav,PublicFooter} from '@/components/product/nav';
import {MarketBoard} from '@/components/product/market-board';

export const metadata: Metadata = {
  title: 'Dashboard — Markets | StockWatchlist',
  description: 'Search any stock, read the S&P 500, Nasdaq, Gold, Dow Jones and Bitcoin, and browse industries. Charts and company details are public; earnings reports are Pro.',
};

export default function Dashboard(){
  return <><PublicNav/><MarketBoard/><PublicFooter/></>;
}
