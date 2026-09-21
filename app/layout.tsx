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
    description: 'Build a what-if stock portfolio and see how your picks perform over time. No signup to start. US, Europe, Canada, and Turkey.',
    url: 'https://stockwatchlist.app',
    siteName: 'StockWatchlist',
    type: 'website',
    images: [{url: '/og.jpg', width: 1200, height: 630, alt: 'StockWatchlist what-if portfolio'}],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StockWatchlist — Watchlists, markets, and earnings',
    description: 'Build a what-if stock portfolio and see how your picks perform over time. No signup to start. US, Europe, Canada, and Turkey.',
    images: ['/og.jpg'],
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
  description: 'Build a what-if stock portfolio and see how your picks perform over time. No signup to start. US, Europe, Canada, and Turkey.',
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
      description: 'StockWatchlist is a what-if portfolio, not a broker. Add tickers, optional shares and cost, and we freeze that starting point. Yahoo shows today’s price. This shows what happened after you put a number on an idea. Start with no account. Separate lists for USD, EUR, CAD, and TRY. Delayed public quotes. Not advice.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
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
