# watch-list

A light stock-watching app for following ideas and sharing them with friends.

## Included

- Welcome page explaining the product, verified-member count and opt-in country map.
- Email/password sign-up with verification, Google/Apple OAuth, password reset and account settings.
- Private account-owned watchlists; company, date added, fixed starting price, current quote, and red/green percentage changes.
- Hover/focus intraday previews and clickable stock-detail pages with charts, statistics, company information and price history.
- Read-only share links, revocation, copy-link and email-draft invitations.
- Free: 1 list / 10 stocks. Pro: 10 lists / 50 stocks, with 25 stocks per page.
- Stripe Checkout, signed webhook reconciliation and Customer Portal integration.
- Supabase Postgres schema, RLS policies, server-side permissions and transactional plan limits.

## Open locally

Double-click **Start Watchlist.command**. It installs dependencies if needed, builds the app and opens http://127.0.0.1:4317. Keep its Terminal window open; Control-C stops the server. Node.js 24 is recommended.

Or use `npm ci`, `npm run build`, `npm start`. Development: `npm run dev -- --port 4317`.

The welcome page works before configuration. Sign-up, private data and payment flows require your own service connections; controls show their unavailable state until configured. No accounts, subscriptions, users on the map or payment confirmations are fabricated. An illustrative landing-page example is explicitly labeled.

## Next steps

Read **[docs/SETUP.md](docs/SETUP.md)** for Supabase, OAuth, email, Stripe, private GitHub, deployment and domain setup. Read **[docs/SERVICES.md](docs/SERVICES.md)** for each service's role, data flow and operational details.

Copy `.env.example` to `.env.local` and fill credentials privately. Never commit secrets. GitHub and public deployment are deferred; this repository is local only.

Your original CRDO watchlist is preserved in `data/watchlists.json` (and its backup), excluded from Git. It is not publicly exposed or automatically assigned to a new account. Future account data lives in Supabase, not this shared JSON file.

## Verification

- `npm test`: legacy JSON persistence, actual PostgreSQL migration/RLS/ownership/limit tests via PGlite, sharing, expiry/downgrade and billing rules.
- `npm run typecheck`: TypeScript.
- `npm run build`: production Node build.

Quotes use Yahoo Finance's public chart endpoint, which is unofficial and can be delayed or rate-limited. Prices are regular-session quotes, not guaranteed real-time or after-hours prices. Publicly accessible does not mean openly licensed for redistribution; review this before a paid public launch. Price changes exclude dividends and split adjustments.
