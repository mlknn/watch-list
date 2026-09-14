import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Log in — StockWatchlist',
  description: 'Log in to StockWatchlist to keep what-if portfolios across devices.',
  alternates: {canonical: 'https://stockwatchlist.app/login'},
};

export default function LoginLayout({children}:{children:React.ReactNode}){
  return children;
}
