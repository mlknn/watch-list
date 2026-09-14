import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Pricing — StockWatchlist',
  description: 'Free: 1 list and 10 stocks. Pro is $2.99/month or $30/year for 10 lists and 50 stocks each. Start without a card.',
  alternates: {canonical: 'https://stockwatchlist.app/pricing'},
  openGraph: {url: 'https://stockwatchlist.app/pricing'},
};

export default function PricingLayout({children}:{children:React.ReactNode}){
  return children;
}
