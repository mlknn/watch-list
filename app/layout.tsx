import {LanguageProvider} from '@/components/product/language';
import {Analytics} from '@/components/product/analytics';
import {GoogleAdsTag} from '@/components/product/google-ads-tag';
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
const softwareJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'StockWatchlist',
  url: 'https://stockwatchlist.app',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web',
  description: 'A what-if stock portfolio that freezes the price and cost from the day you add a pick, then tracks US, Europe, Canada, and Turkey lists. Not a broker. Not investment advice.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(softwareJsonLd)}} /><LanguageProvider><Analytics/><GoogleAdsTag/>{children}</LanguageProvider></body></html>;
}
