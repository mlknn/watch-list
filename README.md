# StockWatchlist

A what-if stock portfolio at [stockwatchlist.app](https://stockwatchlist.app). Yahoo and brokers show today’s price. This freezes the price (and optional cost) from the day you add a pick.

**Not a broker. Not investment advice.** Quotes are delayed public data.

- [Live app](https://stockwatchlist.app) — no account required to start
- [Compare](https://stockwatchlist.app/compare) — vs Yahoo Finance, Google Finance, TradingView
- [Open source notes](https://stockwatchlist.app/open-source)
- Saved lists can issue a read-only `/share/…` link (capability token; do not commit live tokens)
- Markets: US (USD), Europe (EUR), Canada (CAD), Turkey (TRY). Each list locks to the first stock’s currency.

## Features

- Guest lists on this device; save later with email or Google Sign-In
- Frozen add-price, optional shares, purchase date, cost basis, unrealized gain
- Read-only share links
- Dashboard for indexes and sectors
- Free: 1 list / 10 stocks. Pro: $2.99/month or $30/year, 10 lists / 50 stocks each

## Self-host

Node 22+. Copy `.env.example` to `.env.local`. See [docs/SETUP.md](docs/SETUP.md) for Supabase, OAuth, Stripe, and deploy.

```bash
npm ci
npm test
npm run dev
```

Hosted production uses Cloudflare. Keep `LOCAL_AUTH_ENABLED=false` on any public server. Put Stripe, Supabase, and `ANALYTICS_EMAILS` in runtime secrets, not in Git.

## License

[MIT](LICENSE)

Quotes come from Yahoo Finance’s unofficial public chart API and may be delayed or rate-limited. Review that before a paid public deployment.
