import {LanguageProvider} from '@/components/product/language';
import {Analytics} from '@/components/product/analytics';
import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'StockWatchlist — It remembers the price from the day you added the stock',
  referrer: 'no-referrer',
  metadataBase: new URL('https://stockwatchlist.app'),
  openGraph: {
    title: 'StockWatchlist — The price from the day you started watching',
    description: 'Add a stock or ETF and we freeze that day’s quote. See what happened after you noticed it, and share a read-only list with starting prices still on it.',
    url: 'https://stockwatchlist.app',
    siteName: 'StockWatchlist',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'StockWatchlist — The price from the day you started watching',
    description: 'Add a ticker, lock that day’s price, and follow what happens next.',
  },
  icons: {
    icon: [
      { url: '/favicon.ico?v=4', sizes: '16x16 32x32 48x48' },
      { url: '/favicon-32.png?v=4', type: 'image/png', sizes: '32x32' },
      { url: '/favicon.svg?v=4', type: 'image/svg+xml', sizes: 'any' },
    ],
    shortcut: '/favicon.ico?v=4',
    apple: '/apple-touch-icon.png?v=4',
  },
  description: 'Add a stock and we freeze that day’s price. Follow what happened after you started watching, and share the list with starting prices still on it.',
};
export const viewport: Viewport = {width:'device-width',initialScale:1,viewportFit:'cover'};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><LanguageProvider><Analytics/>{children}</LanguageProvider></body></html>;
}
