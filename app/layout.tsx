import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Watchlist — Your market, in focus',
  referrer: 'no-referrer',
  description: 'Follow your stock ideas, track changes from the day you added them, and share watchlists with friends.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
