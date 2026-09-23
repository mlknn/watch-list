import type {Metadata} from 'next';
import {PublicNav,PublicFooter} from '@/components/product/nav';

export const metadata: Metadata = {
  title: 'StockWatchlist vs Yahoo Finance, Google Finance, and TradingView',
  description: 'Watchlists that freeze the add-day price, plus a markets tape and a US earnings calendar. Compared with Yahoo Finance, Google Finance, and TradingView. Not a broker.',
  alternates: {canonical: 'https://stockwatchlist.app/compare'},
  openGraph: {url: 'https://stockwatchlist.app/compare'},
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Is StockWatchlist a Yahoo Finance alternative?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'For a personal paper watchlist that remembers the add-day price, a public markets tape, or a US earnings calendar without an account, yes. Yahoo Finance is stronger for news, live quotes, and research. StockWatchlist is not a broker and is not investment advice.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I use StockWatchlist without an account?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Watchlists start on this device. Markets and the earnings calendar are public. Create a free account only if you want saved lists on another device.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does StockWatchlist have an earnings calendar?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. https://stockwatchlist.app/earnings is a public US earnings calendar for listed companies above $1B. One column per weekday, before the open or after the close. No account required. Source: Nasdaq.',
      },
    },
    {
      '@type': 'Question',
      name: 'Which markets does StockWatchlist cover?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Watchlists lock to USD, EUR, CAD, or TRY. The Markets page covers the US, Europe, Canada, global cash markets (Japan, China, India, Korea, and more), and crypto. The earnings calendar is US-listed companies above $1B.',
      },
    },
  ],
};

export default function Compare() {
  return <>
    <PublicNav/>
    <main className="privacy-page compare-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(faqJsonLd).replace(/</g,'\\u003c')}}/>
      <p className="eyebrow">COMPARE</p>
      <h1>Watchlists, markets, and who reports this week</h1>
      <p className="privacy-updated">Reviewed September 23, 2026. Competitor capabilities below are stated conservatively from public product pages and are not a complete feature audit.</p>
      <p>StockWatchlist is three public pages: watchlists that freeze the add-day price, a markets tape, and a US earnings calendar. No account is required to start. It is not a broker and not investment advice. Quotes are delayed public data.</p>

      <section>
        <h2>Side by side</h2>
        <div className="compare-table-wrap">
          <table className="compare-table">
            <thead>
              <tr>
                <th scope="col"></th>
                <th scope="col">StockWatchlist</th>
                <th scope="col">Yahoo Finance</th>
                <th scope="col">Google Finance</th>
                <th scope="col">TradingView</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Primary job</th>
                <td>Watchlists, markets tape, earnings calendar</td>
                <td>News, quotes, research</td>
                <td>Google-account portfolio</td>
                <td>Charts and social trading</td>
              </tr>
              <tr>
                <th scope="row">Starting price</th>
                <td>Frozen when you add a pick</td>
                <td>Last price (typical)</td>
                <td>Cost if you enter it</td>
                <td>Chart marks</td>
              </tr>
              <tr>
                <th scope="row">Start without an account</th>
                <td>Yes</td>
                <td>Browse public; saving typically needs an account</td>
                <td>Tied to a Google account</td>
                <td>Browse public; saving typically needs an account</td>
              </tr>
              <tr>
                <th scope="row">Watchlist currencies</th>
                <td>USD / EUR / CAD / TRY, one per list</td>
                <td>Global quotes</td>
                <td>Global quotes</td>
                <td>Global quotes</td>
              </tr>
              <tr>
                <th scope="row">Markets page</th>
                <td><a href="/dashboard">US, Europe, Canada, Global, Crypto</a></td>
                <td>Broad research site</td>
                <td>Quotes and news</td>
                <td>Chart-focused workspace</td>
              </tr>
              <tr>
                <th scope="row">Earnings calendar</th>
                <td><a href="/earnings">US-listed, above $1B, weekday columns</a></td>
                <td>Yes</td>
                <td>Not independently verified here</td>
                <td>Economic calendar</td>
              </tr>
              <tr>
                <th scope="row">Read-only share link</th>
                <td>Yes</td>
                <td>Not independently verified here</td>
                <td>Not independently verified here</td>
                <td>Chart snapshots / ideas</td>
              </tr>
              <tr>
                <th scope="row">Open source</th>
                <td><a href="/open-source">MIT</a></td>
                <td>No</td>
                <td>No</td>
                <td>No</td>
              </tr>
              <tr>
                <th scope="row">Buy and sell</th>
                <td>No</td>
                <td>No (research)</td>
                <td>No</td>
                <td>Broker integrations, not this app</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>When to stay on Yahoo, Google, or TradingView</h2>
        <p>Use those tools for headlines, professional-looking charts, options chains, and a live tape. Use StockWatchlist when you want a paper watchlist that keeps the add-day price, a simpler markets board, or who reports this week — without making an account first.</p>
        <p><a className="solid-link" href="/watchlists">Watchlists</a> · <a className="solid-link" href="/dashboard">Markets</a> · <a className="solid-link" href="/earnings">Earnings</a></p>
      </section>
    </main>
    <PublicFooter/>
  </>;
}
