import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Watchlist — Your market, in focus',
  referrer: 'no-referrer',
  icons: {
    icon: [
      { url: '/favicon.ico?v=3', sizes: '16x16 32x32 48x48' },
      { url: '/favicon-32.png?v=3', type: 'image/png', sizes: '32x32' },
      { url: '/favicon.svg?v=3', type: 'image/svg+xml', sizes: 'any' },
    ],
    shortcut: '/favicon.ico?v=3',
    apple: '/apple-touch-icon.png?v=3',
  },
  description: 'Follow your stock ideas, track changes from the day you added them, and share watchlists with friends.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
