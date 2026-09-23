import type {Metadata} from 'next';
import {PublicNav,PublicFooter} from '@/components/product/nav';

export const metadata: Metadata = {
  title: 'Privacy policy — StockWatchlist',
  description: 'How StockWatchlist collects, uses, stores, and shares account data, including Google Sign-In name and email.',
  alternates: {canonical: 'https://stockwatchlist.app/privacy'},
};

export default function Privacy() {
  return <>
    <PublicNav/>
    <main className="privacy-page">
      <p className="eyebrow">PRIVACY POLICY</p>
      <h1>How StockWatchlist uses your data</h1>
      <p className="privacy-updated">Last updated: September 12, 2026. This policy applies to the StockWatchlist web app at <a href="https://stockwatchlist.app">https://stockwatchlist.app</a>.</p>
      <nav className="privacy-toc" aria-label="Contents">
        <strong>Contents</strong>
        <ol>
          <li><a href="#who">Who we are</a></li>
          <li><a href="#google">Google user data</a></li>
          <li><a href="#collect">Information we collect</a></li>
          <li><a href="#use">How we use it</a></li>
          <li><a href="#share">Sharing</a></li>
          <li><a href="#rights">Your choices</a></li>
        </ol>
      </nav>
      <section>
        <h2 id="who">Who we are and what the app does</h2>
        <p>StockWatchlist (“we”, “the app”) is a personal watchlist, markets, and earnings product. Watchlists cover stocks and ETFs from the US, Europe, Canada, and Turkey. You can save tickers, keep the market price from the day you added them, see later performance, optionally record share quantities and purchase details, and share a read-only view of a list. The Markets page and the US earnings calendar are public. It is not a broker, bank, or investment adviser. You can read this policy, the home page, Markets, and Earnings without signing in.</p>

        <h2 id="google">Google user data (Google Sign-In)</h2>
        <p>If you choose Continue with Google, we use Google OAuth only to sign you in. We request basic account identity needed to create or recognize your StockWatchlist account:</p>
        <ul>
          <li>Your Google account email address</li>
          <li>Your Google account name (display name)</li>
        </ul>
        <p>We use that Google user data solely to authenticate you, create or look up your StockWatchlist account, show your name in the product, and send account-related messages such as email verification when those messages are part of sign-in. We do not request access to Gmail, Google Drive, Calendar, Contacts, Photos, or other Google APIs. We do not read, scan, or store the contents of your Google mailbox. We do not use Google user data for advertising, selling data, credit decisions, or training unrelated AI models. We do not share Google user data with other apps or with data brokers.</p>
        <p>Google’s own handling of your Google Account is described in <a href="https://policies.google.com/privacy">Google’s Privacy Policy</a>. You can disconnect Google Sign-In by signing out of StockWatchlist and, in your Google Account, removing StockWatchlist from apps with account access.</p>

        <h2 id="collect">Information we collect</h2>
        <p>Depending on how you use the app, we store:</p>
        <ul>
          <li>Account identifiers: verified email, display name, and an internal user ID from our authentication provider (Supabase Auth). Email and name may come from Google or Apple sign-in, or from the email and password you enter.</li>
          <li>Watchlist content you create: list names, tickers, company names, the date and price recorded when you added a stock, optional share quantities, purchase dates, purchase costs, and notes.</li>
          <li>Optional country: a country you may choose in Account settings for the public community map. We do not request GPS and we do not store a precise location or IP-based geolocation for that map.</li>
          <li>Billing association: if you subscribe, Stripe customer and subscription status. We do not receive or store full card numbers.</li>
          <li>Technical session data: a session token in your browser so you can stay signed in. Signing out clears that session.</li>
          <li>Anonymous product analytics: a random identifier in local storage used only to count unique daily visitors and product actions (opening the app, viewing the dashboard, searching a stock, creating a watchlist, and completing sign-up). We do not store IP addresses for these counts. This first-party count is separate from advertising measurement below.</li>
          <li>Advertising measurement: on stockwatchlist.app we load Google’s conversion tag (Google Ads / gtag) so we can tell Google Ads whether a visit or sign-up likely came from an ad. That tag may set cookies or similar storage on your device and send technical data (such as browser type, page URL, and a click identifier) to Google. It does not receive your Google Sign-In name or email from us.</li>
        </ul>
        <p>We load delayed public market quotes and company information from market-data providers to display prices and research pages. Those requests are for market data, not for your Google account.</p>

        <h2 id="use">How we use information</h2>
        <p>We use the information above to operate StockWatchlist: sign you in, keep your watchlists, refresh quotes, enforce plan limits, process subscriptions, show an aggregate community count, understand which public product steps people use, measure advertising, and fix product problems. We do not sell personal information. We do not use your Google name or email for ads.</p>

        <h2 id="share">How we share information</h2>
        <p>Watchlists stay private until you create a share link. Anyone with that link can view that list (company names, tickers, dates, prices, performance, and any quantities, costs, and notes you entered) and can pass the link on. Shared pages do not include your email, Google account identifier, or billing details. Turning sharing off stops the link from working for future visits.</p>
        <p>We use processors who store or process data on our behalf:</p>
        <ul>
          <li>Supabase — authentication and database hosting for accounts and watchlists</li>
          <li>Google — Google Sign-In if you choose it, as described above; and Google Ads conversion measurement on the public site, as described under advertising measurement. Google’s ads data use is described in <a href="https://policies.google.com/privacy">Google’s Privacy Policy</a> and <a href="https://policies.google.com/technologies/ads">Google’s advertising policies</a>. You can opt out of personalized ads at <a href="https://adssettings.google.com">adssettings.google.com</a>.</li>
          <li>Apple — only if you sign in with Apple</li>
          <li>Stripe — checkout, payment method storage, and subscription management</li>
          <li>Our hosting provider — to serve the website</li>
        </ul>
        <p>We may disclose information if required by law. We do not install Google Analytics as a general traffic product. We do load Google’s Ads conversion tag on stockwatchlist.app to measure ad clicks.</p>

        <h2>Community map</h2>
        <p>We count unique verified accounts that have opened the app. If you choose a country, that country can appear on the public map as one aggregate pin. Countries with very few members are not shown as separate pins. You can clear the country preference in Account settings.</p>

        <h2>Cookies and local storage</h2>
        <p>We use a session cookie or equivalent browser storage so you remain signed in. We store a language preference in local storage. Guests may also have a draft watchlist in local storage. We store a random analytics identifier in local storage so we can count unique visitors per day without using an IP address. Google’s conversion tag may also store advertising cookies used to measure whether you reached the site from a Google ad.</p>

        <h2 id="rights">Retention and your choices</h2>
        <p>We keep account and watchlist data while your account exists. You can remove stocks and watchlists, turn off share links, and clear your country preference in the app. You can sign out to clear the local session. To request deletion of your StockWatchlist account and associated personal data (including Google name and email stored for sign-in), email <a href="mailto:privacy@stockwatchlist.app">privacy@stockwatchlist.app</a> from the address on the account. We will delete or anonymize that account data unless we must retain a limited record for legal, security, or billing reasons (for example, Stripe transaction history held by Stripe).</p>

        <h2>Children</h2>
        <p>StockWatchlist is not directed at children under 13, and we do not knowingly collect personal information from children under 13.</p>

        <h2>Changes</h2>
        <p>If we change how we access, use, store, or share Google user data or other personal data, we will update this page and the “Last updated” date. Continued use after an update means you should review the new policy.</p>

        <h2>Contact</h2>
        <p>Questions about privacy or Google user data: <a href="mailto:privacy@stockwatchlist.app">privacy@stockwatchlist.app</a>. Product home: <a href="https://stockwatchlist.app">https://stockwatchlist.app</a>.</p>
      </section>
    </main>
    <PublicFooter/>
  </>;
}
