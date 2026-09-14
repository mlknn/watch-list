import type {Metadata} from 'next';
import {PublicNav,PublicFooter} from '@/components/product/nav';

export const metadata: Metadata = {
  title: 'Open source — StockWatchlist',
  description: 'StockWatchlist is MIT-licensed. Read the source, self-host it, or use the hosted app at stockwatchlist.app.',
  alternates: {canonical: 'https://stockwatchlist.app/open-source'},
  openGraph: {url: 'https://stockwatchlist.app/open-source'},
};

export default function OpenSource() {
  return <>
    <PublicNav/>
    <main className="privacy-page">
      <p className="eyebrow">OPEN SOURCE</p>
      <h1>MIT-licensed what-if portfolios</h1>
      <p>The StockWatchlist web app is public under the MIT license. The hosted product is <a href="https://stockwatchlist.app">stockwatchlist.app</a>. The source is <a href="https://github.com/mlknn/watch-list" rel="noopener noreferrer">github.com/mlknn/watch-list</a>.</p>
      <section>
        <h2>What you can do</h2>
        <ul>
          <li>Read how lists, frozen add-prices, sharing, and billing work.</li>
          <li>Run it locally. See <a href="https://github.com/mlknn/watch-list/blob/main/docs/SETUP.md" rel="noopener noreferrer">docs/SETUP.md</a>.</li>
          <li>Fork it under MIT. Keep the license notice.</li>
        </ul>
      </section>
      <section>
        <h2>What the hosted app is not</h2>
        <p>stockwatchlist.app is not a broker, not investment advice, and not a promise of real-time professional market data. Quotes come from Yahoo Finance’s unofficial public chart API and may be delayed or rate-limited. Keep <code>LOCAL_AUTH_ENABLED=false</code> on any public server.</p>
      </section>
      <section>
        <h2>Directories</h2>
        <p>Listed on GitHub as a public MIT repo. Submitted to awesome-selfhosted (waiting on their four-month maturity rule). OpenAlternative requires 10 GitHub stars before they accept a listing.</p>
        <p><a className="solid-link" href="https://github.com/mlknn/watch-list" rel="noopener noreferrer">View source on GitHub</a></p>
      </section>
    </main>
    <PublicFooter/>
  </>;
}
