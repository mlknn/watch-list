# Setup

Node 22+. Copy `.env.example` to `.env.local` and fill values there. Never commit real keys.

```bash
npm ci
npm test
npm run typecheck
npm run dev
```

Open http://127.0.0.1:4317. Keep `LOCAL_AUTH_ENABLED=false` on any public server. Local accounts are loopback-only.

## Supabase

1. Create a project. Store the database password in a password manager, not Git.
2. Run every file in `supabase/migrations/` in filename order.
3. Set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. The service role key is server-only.
4. Enable email confirmation. Disable anonymous sign-ins.
5. Set Auth Site URL and redirect URLs for `/auth/callback` and `/auth/reset`.
6. Use custom SMTP for production mail.

## Sign-in providers

Google and Apple are optional. Set `GOOGLE_AUTH_ENABLED` / `APPLE_AUTH_ENABLED` after the provider credentials exist in Supabase. Do not put OAuth client secrets in this repository.

## Stripe

Hosted Checkout only. Put these in Worker secrets or `.env.local`, not in Git:

- `STRIPE_SECRET_KEY`
- `STRIPE_PRO_MONTHLY_PRICE_ID` (USD $2.99 / month)
- `STRIPE_PRO_YEARLY_PRICE_ID` (USD $30 / year)
- `STRIPE_WEBHOOK_SECRET`
- `APP_URL` (your public HTTPS origin)

Webhook URL: `https://YOUR_DOMAIN/api/billing/webhook`.

## Product analytics

`/insights` is limited to emails in `ANALYTICS_EMAILS` (comma-separated). Leave it empty to disable the page.

## Deploy

Cloudflare Workers via `npm run build:staging` and `npm run deploy:staging`. Configure the same runtime secrets on the Worker. Quotes use Yahoo Finance’s unofficial public chart API.
