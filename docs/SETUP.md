# Setup checklist for the next session

The application code is ready for configuration and testing with your accounts. GitHub, public deployment, domain registration, OAuth credentials, Supabase and Stripe provisioning were intentionally deferred. None of those services has been created, connected or charged on your behalf.

## 1. Run locally

Use Node.js 24. Double-click `Start Watchlist.command`, or run:

```sh
npm ci
npm test
npm run typecheck
npm run build
npm start
```

Open http://127.0.0.1:4317. On this Mac, the Desktop `node_modules` folder links to the existing workspace installation to avoid duplicating dependencies on a nearly full disk. On a new machine, run `npm ci` to install your own copy. The welcome page works without credentials. Account and checkout controls accurately show that configuration is pending. To enable them locally, copy `.env.example` to `.env.local` and fill the values privately. Restart after editing settings.

## 2. Connect Supabase

1. Create a Supabase project in the region you intend to serve. Save the database password in your password manager, not the repository.
2. Run `supabase/migrations/202609050001_watchlist.sql` once in its SQL editor. The migration creates tables, RLS policies and service-only transaction functions. Do not run it repeatedly over an already migrated project; future schema changes must use new migrations.
3. Copy the project URL, publishable key, and service-role secret into `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. The service key is server-only. It must never have a browser-public environment variable prefix.
4. Enable email/password Auth and **Confirm email**. Disable anonymous sign-ins. Set the minimum password length to at least 12 and configure auth rate limits.
5. Set Auth Site URL to the app origin. Allow the exact `/auth/callback` and `/auth/reset` redirect URLs for local development and, later, your production domain.
6. Configure custom SMTP for verification and reset messages. Supabase's default sender is for limited testing; production needs a verified sender. Add the sender's SPF/DKIM records and test delivery.
7. Create and verify two test accounts. Check that each can see only their own lists. The first real account is not automatically granted site-wide admin access or ownership of the legacy JSON.

Official references: [Supabase password/email auth](https://supabase.com/docs/guides/auth/passwords), [row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security), [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

## 3. Google and Apple

For Google, create a Web OAuth client and consent screen in Google Cloud. Set the JavaScript origin to your app origin and the redirect URI to the Supabase callback displayed in the Google provider settings. Add the client ID and secret to Supabase, then set `GOOGLE_AUTH_ENABLED=true` in this app. Test returning and new users.

For Apple, configure Sign in with Apple in your Apple Developer account: primary App ID, Services ID, verified domain/return URL and signing key. Add the provider credentials in Supabase and set `APPLE_AUTH_ENABLED=true`. Follow Apple's credential-renewal requirements and maintain an expiry reminder for the generated client secret. Apple web sign-in needs an HTTPS domain; finish that test after deployment.

References: [Google setup](https://supabase.com/docs/guides/auth/social-login/auth-google), [Apple setup](https://supabase.com/docs/guides/auth/social-login/auth-apple).

## 4. Choose trial and Pro pricing

You have not set a Pro price or trial length yet. The default free tier does not expire (`FREE_TRIAL_DAYS=0`) and has 1 list / 10 stocks. A positive number sets a time-limited trial for newly created app profiles; changing it does not rewrite existing accounts' expiry dates.

Create a Stripe Product called Watchlist Pro and a recurring Price at the amount/currency/billing period you choose. Pro gives 10 lists / 50 stocks each. The pricing page reads the amount from Stripe, so it cannot drift from the checkout price.

## 5. Connect Stripe in test mode first

1. Finish any Stripe business/account steps yourself, then stay in test mode.
2. Set `STRIPE_SECRET_KEY` to the test secret key and `STRIPE_PRO_PRICE_ID` to the recurring test price.
3. Configure the Customer Portal to permit cancellations and payment-method changes. Do not enable switching to unrelated products unless the entitlement logic is expanded.
4. Use Stripe CLI forwarding for local tests:

```sh
stripe login
stripe listen --forward-to http://127.0.0.1:4317/api/billing/webhook
```

5. Put the listener's signing secret into `STRIPE_WEBHOOK_SECRET`, then restart the app.
6. Create Checkout from a verified test account and use a Stripe-provided test payment method. Verify that Pro is granted only after confirmed active subscription state.
7. Test duplicate webhook deliveries, payment failure, subscription renewal/cancellation, and portal return. Code-level checks exist; a real test-mode round trip is still required.
8. For production, register `https://YOUR_DOMAIN/api/billing/webhook` in Stripe for: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`.
9. Replace every test value with its corresponding live value only when you choose to launch. The live endpoint has its own signing secret.

References: [Stripe subscriptions](https://docs.stripe.com/billing/subscriptions/overview), [webhooks](https://docs.stripe.com/webhooks), [Customer Portal](https://docs.stripe.com/customer-management).

## 6. Private GitHub repository — later

This Desktop folder is a local Git repository. A private GitHub repository has not been created. When ready, create an empty private `watch-list` repository under your chosen GitHub account. Keep visibility **Private**. Add the remote and push the local branch using your normal GitHub credentials.

Secrets, dependency folders, generated builds, logs and legacy personal JSON are ignored. `.env.example`, migration files, source and the GitHub Actions validation workflow are included. Review `git status` before every push. The CI workflow runs the tests, TypeScript and production build without live service credentials.

## 7. Deployment and domain — later

The current configuration builds a Node-hosted app. Select a host that runs Node.js 24 and supports server routes (not static-only hosting). Start from a private/staging deployment. Configure the same runtime environment variables as local development in the host's secret settings; do not bake secrets into an image or client bundle. Enable HTTPS. On a general Node host, the server must listen on the host-provided PORT and 0.0.0.0, instead of the local launcher's loopback-only defaults.

This project retains Sites metadata from its initial scaffold. If choosing Sites hosting, adapt the runtime to its Cloudflare Worker build output before publishing; the current Node build is not a Sites deployment archive. The external Supabase calls are HTTP-based and can be retained. Do not attempt to publish the legacy file store as cloud persistence.

Once you buy a domain, add it to the selected host and follow the exact DNS records the host provides. Wait for HTTPS to be provisioned. Set `APP_URL` to the final HTTPS origin, update Supabase's Site URL and redirect allowlist, update Google/Apple settings where required, and register the Stripe webhook on the final domain. Test the final domain instead of assuming the temporary hostname's configuration transfers automatically.

Before public launch, verify email delivery, Google/Apple sign-in, owner/non-owner permissions, shared-link revocation, plan limits, payment lifecycle, and production database backups. Confirm market-data redistribution rights for a public paid app. Add your real operator/contact details and launch policies. The current privacy page describes implemented behavior but does not include operator-specific contact information.

## What remains intentionally unverified

Live Google/Apple/SMTP flows, live Supabase project configuration, and Stripe Checkout/webhook delivery have not been exercised because no external credentials are configured. The repository includes executable Postgres-migration/RLS tests using PGlite and unit tests for the billing entitlement rules. PGlite tests do not substitute for testing a real Supabase project and Stripe test mode. WebMCP is optional and feature-detected; it has not been validated in a signed-in browser context.
