import type {Metadata} from 'next';
import {PublicNav,PublicFooter} from '@/components/product/nav';

export const metadata: Metadata = {
  title: 'StockWatchlist vs Yahoo Finance, Google Finance, and TradingView',
  description: 'Yahoo, Google, and TradingView show today’s price. StockWatchlist freezes the add-day price, then adds Markets and Earnings. US, Europe, Canada, and Turkey. Not a broker.',
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
        text: 'For a personal paper portfolio that remembers the price from the day you added a stock, yes. Yahoo Finance is stronger for news, live quotes, and a conventional watchlist of today’s prices. StockWatchlist is not a broker and is not investment advice.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I use StockWatchlist without an account?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. You can build a list on this device first. Create a free account only if you want the list on another device.',
      },
    },
    {
      '@type': 'Question',
      name: 'Which markets does StockWatchlist cover?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'US (USD), Europe (EUR), Canada (CAD), and Turkey (TRY). Each list locks to the currency of the first stock you add.',
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
      <h1>A paper book, not another live quote screen</h1>
      <p>Yahoo Finance, Google Finance, and TradingView are excellent at showing what a ticker does <em>today</em>. StockWatchlist answers a narrower question: what happened after you put a number on an idea. The add-day price (and optional cost, shares, and purchase date) stay frozen. Markets covers US, Europe, Canada, and Turkey. Earnings is a weekly calendar of who reports next. It is not a broker and not investment advice. Quotes are delayed public data.</p>

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
                <td>What-if / paper portfolio</td>
                <td>News, quotes, research</td>
                <td>Google-account portfolio</td>
                <td>Charts and social trading</td>
              </tr>
              <tr>
                <th scope="row">Starting price</th>
                <td>Frozen when you add a pick</td>
                <td>Today’s last price</td>
                <td>Lots/cost if you enter them</td>
                <td>Live chart marks</td>
              </tr>
              <tr>
                <th scope="row">Start without an account</th>
                <td>Yes</td>
                <td>Browse yes; save needs Yahoo</td>
                <td>Needs Google</td>
                <td>Browse yes; save needs account</td>
              </tr>
              <tr>
                <th scope="row">US / Europe / Canada / Turkey lists</th>
                <td>Separate currency lock per list</td>
                <td>Global quotes</td>
                <td>Global quotes</td>
                <td>Global quotes</td>
              </tr>
              <tr>
                <th scope="row">Read-only share link</th>
                <td>Yes</td>
                <td>Limited</td>
                <td>Limited</td>
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
        <p>Use those tools for headlines, professional-looking charts, options chains, and anything that needs a live tape. Use StockWatchlist when you want a quiet paper book: name a thesis, add tickers, lock the starting point, and look back later.</p>
        <p><a className="solid-link" href="/watchlists">Build a portfolio — no signup</a></p>
      </section>
    </main>
    <PublicFooter/>
  </>;
}
