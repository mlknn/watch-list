import {LanguageProvider} from '@/components/product/language';
import {Analytics} from '@/components/product/analytics';
import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'StockWatchlist — What if you invested in your picks today?',
  referrer: 'no-referrer',
  metadataBase: new URL('https://stockwatchlist.app'),
  openGraph: {
    title: 'StockWatchlist — Build a what-if stock portfolio',
    description: 'Build a portfolio, set starting amounts, and track what happens. No signup to start. Freeze the day you put a number on an idea.',
    url: 'https://stockwatchlist.app',
    siteName: 'StockWatchlist',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'StockWatchlist — Build a what-if stock portfolio',
    description: 'Pick stocks, set starting amounts, and see how the portfolio performs. No signup to start.',
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
  description: 'Build a what-if stock portfolio and see how your picks perform over time. No signup to start.',
};
export const viewport: Viewport = {width:'device-width',initialScale:1,viewportFit:'cover'};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><LanguageProvider><Analytics/>{children}</LanguageProvider></body></html>;
}
