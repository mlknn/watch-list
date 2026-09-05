# watch-list

A light stock-watching app for following ideas and sharing them with friends.

## Included

- Welcome page explaining the product, verified-member count and opt-in country map.
- Email/password sign-up with verification, Google/Apple OAuth, password reset and account settings.
- Private account-owned watchlists; company, date added, fixed starting price, current quote, and red/green percentage changes.
- Hover/focus intraday previews and clickable stock-detail pages with charts, statistics, company information and price history.
- Read-only share links, revocation, copy-link and email-draft invitations.
- Basic: 1 list / 10 stocks. Pro: $2.99 USD/month, 10 lists / 50 stocks.
- Advanced Pro watchlists: fractional share quantities, purchase dates, cost basis, unrealized gains, notes, allocation weights, and 1D/1M/3M/1Y/5Y/all-time portfolio charts.
- Watchlist search and CSV export; read-only sharing includes position details.
- Stripe Checkout, signed webhook reconciliation and Customer Portal integration.
- Supabase Postgres schema, RLS policies, server-side permissions and transactional plan limits.

## Open locally

Double-click **Start Watchlist.command**. It installs dependencies if needed, builds the app and opens http://127.0.0.1:4317. Keep its Terminal window open; Control-C stops the server. Node.js 24 is recommended.

Or use `npm ci`, `npm run build`, `npm start`. Development: `npm run dev -- --port 4317`.

Local account mode is enabled in this Desktop installation. Use the requested `harzem@admin` login and the password you supplied; it has Pro access. Normal local accounts use signup → local verification inbox → dashboard. Local inbox links simulate email delivery; they do not prove email ownership. Google/Apple and real email delivery still require service configuration. Passwords are salted scrypt hashes; sessions use expiring HttpOnly cookies. Local mode only accepts loopback origins and must stay disabled on public deployments.

The welcome page uses Tesla (Jan 2, 2020), Micron and Nvidia (Jan 3, 2023) with real split-adjusted historical closes and refreshed market quotes. These are labeled example entries, not real member actions.

## Next steps

Read **[docs/SETUP.md](docs/SETUP.md)** for Supabase, OAuth, email, Stripe, private GitHub, deployment and domain setup. Read **[docs/SERVICES.md](docs/SERVICES.md)** for each service's role, data flow and operational details.

Copy `.env.example` to `.env.local` and fill credentials privately. Never commit secrets. GitHub and public deployment are deferred; this repository is local only.

Your original watchlists were copied into the local admin account with starting prices and dates intact. The original `data/watchlists.json` is preserved. Local accounts live in `data/accounts.pg`; watchlist mutations also save `data/watchlists-export.json`. All of `data/` and local settings are excluded from Git. Back up the whole data folder while the server is stopped. Never run two server processes against the same local database.

Local accounts and passwords do not automatically migrate to Supabase. Complete hosted setup and plan an explicit data import before launch.

## Verification

- `npm test`: legacy JSON persistence, actual PostgreSQL migration/RLS/ownership/limit tests via PGlite, sharing, expiry/downgrade and billing rules.
- `npm run typecheck`: TypeScript.
- `npm run build`: production Node build.

Quotes use Yahoo Finance's public chart endpoint, which is unofficial and can be delayed or rate-limited. Prices are regular-session quotes, not guaranteed real-time or after-hours prices. Publicly accessible does not mean openly licensed for redistribution; review this before a paid public launch. Watchlist returns compare the fixed price at add to the current quote; they exclude dividends and do not automatically adjust the saved baseline after a future split. Advanced portfolios use currently entered share quantities and costs on today’s split basis and exclude sold holdings, dividends, fees, and tax.

Update: Basic and Pro both include advanced watchlists and portfolio performance. Basic remains 1 list / 10 stocks; Pro remains $2.99/month for 10 lists / 50 stocks each. Quantities, purchase costs and purchase dates are fixed once saved. Existing rows without quantities allow owner-only one-time setup. Apply all three SQL migrations in filename order for hosted Supabase. Shared watchlist and portfolio routes are public read-only capabilities; no login is required. Localhost links cannot be opened from other computers until deployment.

Latest pricing and presentation: Pro is $2.99 USD/month or $30 USD/year (annual billing; $2.50/month equivalent). Configure STRIPE_PRO_MONTHLY_PRICE_ID for 299 cents/month and STRIPE_PRO_YEARLY_PRICE_ID for 3000 cents/year. Both signed subscription price IDs grant Pro; Checkout validates the selected price and interval. The welcome page models $1,000 each in NVDA, MU, TSLA, AAPL, MSFT, and AMZN since September 3, 2021; its displayed return is calculated, not hard-coded. Watchlist charts now open through the top performance button, including shared views.
