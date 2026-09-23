# StockWatchlist

Three tools at [stockwatchlist.app](https://stockwatchlist.app): **watchlists**, **markets**, and a **US earnings calendar**. No account required to start.

**Not a broker. Not investment advice.** Quotes are delayed public data.

- [Watchlists](https://stockwatchlist.app/watchlists) — freeze the add-day price (and optional cost). Lists lock to USD, EUR, CAD, or TRY.
- [Markets](https://stockwatchlist.app/dashboard) — US, Europe, Canada, global cash markets, and crypto. Indexes, ETFs, gainers and losers.
- [Earnings](https://stockwatchlist.app/earnings) — US-listed names above $1B, one column per weekday. Source: Nasdaq.
- [Compare](https://stockwatchlist.app/compare) — vs Yahoo Finance, Google Finance, TradingView
- [Open source notes](https://stockwatchlist.app/open-source)
- Saved lists can issue a read-only `/share/…` link (capability token; do not commit live tokens)

Yahoo and brokers show today’s price. Watchlists here freeze the starting point, then show what happened after you put a number on an idea.

## Features

- Guest lists on this device; save later with email or Google Sign-In
- Frozen add-price, optional shares, purchase date, cost basis, unrealized gain
- Read-only share links
- Markets switcher: US, Europe, Canada, Global, Crypto
- US earnings calendar (this week, next week, two quarters back)
- Free for everyone: up to 5 lists and 20 stocks in each

## Self-host

Node 22+. Copy `.env.example` to `.env.local`. See [docs/SETUP.md](docs/SETUP.md) for Supabase, OAuth, and deploy.

```bash
npm ci
npm test
npm run dev
```

Hosted production uses Cloudflare. Keep `LOCAL_AUTH_ENABLED=false` on any public server. Put Supabase and `ANALYTICS_EMAILS` in runtime secrets, not in Git.

## License

[MIT](LICENSE)

Quotes come from Yahoo Finance’s unofficial public chart API and may be delayed or rate-limited. The earnings calendar uses Nasdaq. Review both before a paid public deployment.
