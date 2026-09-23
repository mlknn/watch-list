import {LanguageProvider} from '@/components/product/language';
import {ThemeProvider} from '@/components/product/theme';
import {Analytics} from '@/components/product/analytics';
import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'StockWatchlist — Watchlists, markets, and earnings',
  referrer: 'no-referrer',
  metadataBase: new URL('https://stockwatchlist.app'),
  openGraph: {
    title: 'StockWatchlist — Watchlists, markets, and earnings',
    description: 'Watchlists that freeze the add-day price, a markets tape (US, Europe, Canada, global, crypto), and a US earnings calendar. No account needed to start.',
    url: 'https://stockwatchlist.app',
    siteName: 'StockWatchlist',
    type: 'website',
    images: [{url: '/og-2026.png', width: 1200, height: 630, alt: 'StockWatchlist — watchlists, markets, and earnings'}],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StockWatchlist — Watchlists, markets, and earnings',
    description: 'Watchlists that freeze the add-day price, a markets tape (US, Europe, Canada, global, crypto), and a US earnings calendar. No account needed to start.',
    images: ['/og-2026.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico?v=6', sizes: '16x16 32x32 48x48' },
      { url: '/favicon-32.png?v=6', type: 'image/png', sizes: '32x32' },
      { url: '/favicon.svg?v=6', type: 'image/svg+xml', sizes: 'any' },
    ],
    shortcut: '/favicon.ico?v=6',
    apple: '/apple-touch-icon.png?v=6',
  },
  description: 'Watchlists that freeze the add-day price, a markets tape (US, Europe, Canada, global, crypto), and a US earnings calendar. No account needed to start.',
};
export const viewport: Viewport = {width:'device-width',initialScale:1,viewportFit:'cover'};
const softwareJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      name: 'StockWatchlist',
      url: 'https://stockwatchlist.app/',
    },
    {
      '@type': 'WebApplication',
      name: 'StockWatchlist',
      url: 'https://stockwatchlist.app/',
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Web',
      license: 'https://github.com/mlknn/watch-list/blob/main/LICENSE',
      codeRepository: 'https://github.com/mlknn/watch-list',
      sameAs: ['https://github.com/mlknn/watch-list'],
      isAccessibleForFree: true,
      description: 'Three tools: watchlists that freeze the add-day price and optional cost, a markets tape for the US, Europe, Canada, global cash markets, and crypto, and a US earnings calendar. No account needed to start. Not a broker. Not investment advice.',
      featureList: [
        'Watchlists that freeze the starting price, with optional shares and cost',
        'Currency-locked lists: USD, EUR, CAD, TRY',
        'Markets board: US, Europe, Canada, Global, Crypto',
        'US earnings calendar for companies above $1B, one column per weekday',
        'No account required to start',
      ],
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      hasPart: [
        { '@type': 'WebPage', name: 'Watchlists', url: 'https://stockwatchlist.app/watchlists', description: 'Paper watchlists that freeze the add-day price. Optional shares, cost, and a read-only share link. Lists lock to USD, EUR, CAD, or TRY.' },
        { '@type': 'WebPage', name: 'Markets', url: 'https://stockwatchlist.app/dashboard', description: 'Indexes, ETFs, sector lists, gainers and losers across the US, Europe, Canada, global cash markets, and crypto.' },
        { '@type': 'WebPage', name: 'Earnings', url: 'https://stockwatchlist.app/earnings', description: 'US-listed earnings calendar above $1B. One column per weekday. Before open or after close. Source: Nasdaq.' },
      ],
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" suppressHydrationWarning>
    <head>
      <script dangerouslySetInnerHTML={{__html:"(function(){try{var t=localStorage.getItem('watchlist-theme');document.documentElement.classList.toggle('dark',t==='dark');}catch(e){document.documentElement.classList.remove('dark');}})();"}}/>
      <script async src="https://www.googletagmanager.com/gtag/js?id=AW-18447742703"/>
      <script dangerouslySetInnerHTML={{__html:"window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','AW-18447742703');"}}/>
    </head>
    <body>
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(softwareJsonLd).replace(/</g,'\\u003c')}} />
      <LanguageProvider><ThemeProvider><Analytics/>{children}</ThemeProvider></LanguageProvider>
    </body>
  </html>;
}
