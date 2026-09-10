# Services and data flow

This version uses one web application with managed services. The code is separated by responsibility; it does not need a fleet of separately deployed microservices yet.

## 1. Web application and API

**Code:** `app/`, `components/product/`, `server/http.mjs`.

React provides the welcome page, sign-up/sign-in, watchlists, shared views, plans, and account settings. Vinext serves pages and the API from one Node.js process. The local server listens on 127.0.0.1:4317. A future production host must terminate HTTPS and route public requests to the server.

Private API requests include the current Supabase access token. The backend validates it with Supabase Auth on every request. Browser state, hidden controls, URL parameters, user metadata, and client-supplied plan names do not grant authorization.

## 2. Identity service — Supabase Auth

**Code:** `lib/auth-client.ts`, `components/product/auth-form.tsx`, `server/cloud.mjs`.

Supports email/password with verification, Google OAuth, Apple OAuth, password reset, and sign-out. OAuth uses PKCE. Google and Apple are enabled independently after their provider configuration is complete. Unverified and anonymous users are rejected by the private API.

Supabase stores credentials, sends verification/reset mail through configured SMTP, and issues short-lived access tokens. The browser SDK manages session persistence and refresh. A server-only service key is never returned by `/api/config`; only the public project URL/key are exposed there.

Production dependencies: Supabase project; Google OAuth client; Apple Services ID/key; SMTP sender/domain. Email-confirmation and redirect settings must be configured as described in SETUP.md. Email links using PKCE should be opened in the browser where the flow began; otherwise users can sign in after verification or request a new link.

## 3. Watchlist database — Supabase Postgres

**Schema:** `supabase/migrations/202609050001_watchlist.sql`.

- `wl_profiles`: one profile per verified account that opens the application. Optional country, free-trial expiry, Stripe customer mapping, and server-controlled entitlement.
- `wl_watchlists`: owner, name, creation time, optional unguessable read-only share token.
- `wl_stocks`: ticker and immutable quote snapshot recorded at add time. The snapshot stores company name, currency, exchange, price and quote timestamp; the row stores the actual addition time.
- `wl_quotes`: shared quote cache across users and server instances, with fetch time/error status.
- `wl_rate_limits`: persistent per-account/per-shared-list request limits.
- `wl_stripe_events`: processed event identifiers for webhook retries.

RLS permits signed-in database clients to read only their own profile/lists/stocks. Direct client writes are revoked. Service-only RPCs perform account mutations. Each mutation locks the owner's profile before checking plan limits, preventing concurrent additions from exceeding those limits. All list actions also check the owner.

Free: 1 list, 10 stocks. Pro: 10 lists, 50 stocks each. The web table shows 25 stocks per page; the account API loads at most 500 stock rows. Existing data is preserved on downgrade; extra lists cannot accept new stocks. This is client-side pagination within a bounded account, not an unbounded database scan.

The local `data/watchlists.json` and `.bak` from the original app are preserved but are no longer exposed by any API. They have not been assigned to a new account automatically. Import them into the intended verified owner account during setup, preserving their original timestamps and prices.

## 4. Market-data service — public Yahoo Finance endpoint

**Code:** `server/quotes.mjs`, quote cache helpers in `server/cloud.mjs`.

The backend requests the public chart endpoint, trying two Yahoo hosts. It validates company name, price, currency and timestamp. Requests have timeouts and concurrency limits. Individual requests are cached, and shared Postgres quotes are reused for 60 seconds.

Visible account/shared pages request updates once a minute and when the tab becomes visible. Closing the browser stops polling. There is no independent background scheduler. At add time, an actual provider quote is required; failed fetches cannot invent a baseline. Failed refreshes preserve prior quotes and display an error. Currency mismatches and older quotes cannot replace a comparable price.

These are latest regular-session quotes, often the last close outside market hours. Price comparisons do not include dividends or adjust the original baseline for splits. Yahoo's publicly accessible data is not an openly licensed redistribution feed. Before monetized public launch, confirm the provider permits your use and replace the adapter with a licensed data feed if needed. See Yahoo's exchange-delay guide: https://help.yahoo.com/kb/finance/article-exchanges-data-delays-sln2310.html

## 5. Sharing and invitations

**Code:** share RPCs, `app/api/share/[token]/route.ts`, `app/share/[token]/page.tsx`.

Tokens contain 32 random bytes encoded as URL-safe text. Friends do not need an account to read a shared list. The response omits owner identity, email and billing data. No shared-write API exists. Creating a link again returns the existing link; turning sharing off revokes it; creating a later link uses a different token.

The owner copies the link or opens an email draft. The app does not send invitation mail automatically. Shared pages use no-referrer and noindex metadata. A recipient can forward the link or retain a copy of data already viewed; revocation controls future access.

## 6. Billing — Stripe Checkout, webhooks, Customer Portal

**Code:** `server/billing.mjs`, `app/api/billing/`.

The server selects the configured Pro Price ID; clients cannot select an arbitrary price or assign Pro. Stripe hosts the payment form, stores card details, and handles billing. The app stores only the customer association and entitlement status/expiry.

A verified user starts Checkout. Customer creation and session creation use idempotency keys; open sessions are reused. The return page asks the server to reconcile the subscription. A successful redirect alone never activates Pro.

Signed webhook deliveries trigger a fresh fetch of Stripe subscription state. Only an active, unexpired subscription containing the configured Pro price grants entitlement. Canceled, unpaid, past-due, expired, wrong-product, or pending subscriptions do not. Renewal/cancellation events keep entitlement current. Duplicate event IDs and older concurrent reconciliation results do not overwrite newer database state. Stripe Customer Portal handles cancellation and payment-method updates.

No payments can be accepted until test/live keys, the recurring Price, webhook endpoint, and portal are configured. Never mix test and live keys or webhook signing secrets.

## 7. Community counts and country map

**Code:** `components/product/community.tsx`, `wl_community()` SQL RPC, `lib/world-map.json`.

The count is distinct verified accounts that have initialized an account workspace, not pageviews, cookies, or visitors guessed from IP addresses. Country is optional and user-selected. Aggregates below three people are suppressed. No GPS, IP geolocation or Google Analytics is added. Natural Earth map boundaries are processed using world-atlas; regeneration is in `scripts/generate-map.mjs`.

## 9. Product analytics

**Code:** `server/analytics.mjs`, `lib/analytics.ts`, `app/insights/page.tsx`, `supabase/migrations/202609110001_analytics.sql`.

First-party counts live in Postgres. The browser keeps a random visitor id in local storage and posts allowlisted events (`visit`, `dashboard`, `stock_search`, `watchlist_created`). Sign-ups are recorded when a profile is created. Unique counts are per UTC day. The `/insights` page and `GET /api/analytics` are limited to two account emails. There is no admin account role.

## Operations

`/api/health` verifies the app process is running; it does not claim the database, sign-in or payment providers are configured. Use startup checks and real end-to-end tests after connections are added. Monitor server errors, Supabase database/auth usage and failed Stripe deliveries separately. Configure database backups in Supabase. Periodically remove old rate-limit rows and retain payment event IDs according to your billing/audit policy. Error logs omit tokens and payloads.

## 8. Stock charts and company details

**Code:** `server/charts.mjs`, `server/fundamentals.mjs`, `components/product/stock-link.tsx`, `components/product/price-chart.tsx`, `app/stocks/[symbol]/page.tsx`.

Hovering or focusing a stock name/ticker loads an intraday preview; clicking opens the stock-detail page. The one-day view requests five days of five-minute bars and selects the most recent trading date in the exchange's timezone, so weekends and holidays show the last available session. Longer views support 5D, 1M, 3M, 6M, YTD, 1Y, 5Y and Max. Dates, currency, quote time, and data availability are displayed.

The details page includes overview, statistics, company description, price history with pagination, a full-chart dialog, and add-to-watchlist for verified users. Company fundamentals are requested separately through the open-source yahoo-finance2 library so a delayed fundamentals response does not block the chart. Missing data is marked unavailable, not inferred. After-hours prices appear only when provided. Daily/historical bars use unadjusted closes; stock splits can therefore create discontinuities. Detail-page price change compares with the previous close, while watchlist change compares with the immutable price at add.

Chart requests are cached for one minute per symbol/range and fundamentals for five minutes, with bounded cache sizes, fetch timeouts and in-flight deduplication. These public routes contain only market data, not account information. Add CDN-level rate limits before a high-traffic public launch. The charts use Recharts and the existing Shadcn chart/hover primitives. No provider data is fabricated when a request fails.


## Local account service and advanced portfolios

`server/local-auth.mjs` provides loopback-only local signup, simulated verification/reset delivery, scrypt password hashes, expiring single-use tokens and HttpOnly cookie sessions. Persisted rate limits restrict login attempts. The optional local seed account contains only a salted password hash and is ignored by Git. This does not verify ownership of email addresses and is disabled for a public APP_URL.

`server/local-db.mjs` uses filesystem-backed PGlite with the same SQL migrations and ownership/plan RPCs as Supabase. It exports private watchlist JSON after changes; the password/session tables are excluded from the JSON export. Node filesystem storage is documented by [PGlite](https://pglite.dev/docs/filesystems).

`server/portfolio.mjs` fetches historical bars with bounded concurrency and aggregates quantities from entered acquisition dates. It keeps invested capital separate from market value, omits unknown positions explicitly and refuses incomplete provider history instead of inventing totals. It models current holdings only, not a brokerage transaction ledger. Advanced positions are USD-only to avoid summing currencies without an exchange-rate model.

`server/showcase.mjs` fetches actual dated daily closes for TSLA/MU/NVDA, compares them with current quotes, and caches the result for 60 seconds. Source dates and split-adjustment methodology are visible in the welcome card.

Stripe pricing is fixed to USD 299 cents per month and validated before starting Checkout. Reference: [Stripe product and price setup](https://docs.stripe.com/products-prices/manage-prices?dashboard-or-api=api).
