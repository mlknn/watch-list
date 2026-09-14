import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Sign up — StockWatchlist',
  description: 'Create a free StockWatchlist account to save paper portfolios. No card required.',
  alternates: {canonical: 'https://stockwatchlist.app/signup'},
};

export default function SignupLayout({children}:{children:React.ReactNode}){
  return children;
}
