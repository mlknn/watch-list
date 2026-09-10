import {LanguageProvider} from '@/components/product/language';
import {Analytics} from '@/components/product/analytics';
import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'StockWatchlist — Track stocks and ETFs from the day you add them',
  referrer: 'no-referrer',
  icons: {
    icon: [
      { url: '/favicon.ico?v=4', sizes: '16x16 32x32 48x48' },
      { url: '/favicon-32.png?v=4', type: 'image/png', sizes: '32x32' },
      { url: '/favicon.svg?v=4', type: 'image/svg+xml', sizes: 'any' },
    ],
    shortcut: '/favicon.ico?v=4',
    apple: '/apple-touch-icon.png?v=4',
  },
  description: 'StockWatchlist is a web app for personal stock and ETF watchlists. Save a starting price, follow performance, and share a read-only list. You can read how the product works and our privacy policy without signing in.',
};
export const viewport: Viewport = {width:'device-width',initialScale:1,viewportFit:'cover'};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><LanguageProvider><Analytics/>{children}</LanguageProvider></body></html>;
}
