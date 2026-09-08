# Stripe integration setup

## Current staging status

The Checkout settings and Pro-limit message are deployed. Live price validation passes for $2.99/month and $30/year. Anonymous Checkout requests are rejected, and the webhook rejects unsigned requests. A signed Stripe event and an end-to-end test payment still need verification.

## Values to replace

No sample placeholders remain in the Checkout call in [server/billing.mjs](server/billing.mjs). The existing subscription mode, configured Price IDs, and application success/cancel URLs are preserved. Runtime billing settings must still be configured; no successful Stripe payment has been verified.

Use these server-only Cloudflare Worker secrets (Settings → Variables and Secrets, outside Build settings):

- `STRIPE_SECRET_KEY`: your Stripe test secret key (`sk_test_` prefix). Never commit or share its value.
- `STRIPE_PRO_MONTHLY_PRICE_ID`: active recurring USD price of $2.99 per month.
- `STRIPE_PRO_YEARLY_PRICE_ID`: active recurring USD price of $30 per year.
- `STRIPE_WEBHOOK_SECRET`: signing secret for the webhook destination below.
- `APP_URL`: `https://stockwatchlist.app` (already configured during staging setup).

[.env.example](.env.example) documents local configuration names. Put local values in ignored `.env.local`. No browser publishable key or VITE-prefixed Stripe secret is needed for this hosted redirect flow. `STRIPE_PRO_PRICE_ID` is a legacy monthly fallback; prefer the explicit monthly and yearly names above.

## Configured parameters

The existing call in [server/billing.mjs](server/billing.mjs) uses:

- `ui_mode`: `hosted_page` (installed Stripe SDK 22.6.1).
- `billing_address_collection`: `auto`.
- `phone_number_collection.enabled`: `false`.
- `automatic_tax.enabled`: `false`.
- `allow_promotion_codes`: `false`.
- `payment_method_collection`: `always`.
- `submit_type`: `auto`.
- `integration_identifier`: `hosted_web_0001`.
- `origin_context`: `web`.

Existing customer association, client reference, price metadata, subscription metadata, and idempotency options are preserved with approval. No API version override was added.

## Setup and next steps

1. In the Stripe test environment, create Watchlist Pro with monthly and yearly recurring prices matching the amounts above. Copy both Price IDs into the corresponding Worker secrets.
2. Add the test secret API key to the Worker secrets.
3. In Stripe Workbench → Webhooks, create an event destination for:
   `https://stockwatchlist.app/api/billing/webhook`
4. Select these events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, and `invoice.payment_failed`.
5. Save that destination's signing secret as `STRIPE_WEBHOOK_SECRET`. Configure the Stripe customer portal to allow subscription management and cancellation.
6. Deploy the updated source with `npm run build:staging` and `npm run deploy:staging`. Apply secrets to the Worker runtime, not the build environment. Existing dependencies are sufficient.
7. Sign into a Basic test account and start a monthly subscription from Pricing. In Stripe test mode, use card `4242 4242 4242 4242`, a future expiry, and any three-digit CVC. Never use real payment details for this test.
8. Confirm the return to `/account?checkout=success`, successful webhook deliveries, and Pro access on that same account. Repeat with a separate Basic test account for yearly billing. Check canceling Checkout returns to `/pricing?checkout=canceled` without granting Pro.
9. Test portal cancellation, renewal/payment failures, and plan expiry. Verify access follows subscription status and that duplicate webhook deliveries do not grant duplicate entitlements.
10. Before enabling live payments, configure live products, keys, webhook signing secret, and customer portal separately. Reassess tax requirements before launch; automatic tax is disabled by the selected Studio settings.

## Integration flow and files

The signed-in member selects a plan. The existing billing service validates its price, retrieves the member's stored Stripe customer, and creates or reuses a hosted Checkout Session. Stripe redirects back to the app. The existing signed webhook handler synchronizes paid subscription status to the member's database profile; the browser redirect alone does not grant Pro. Stripe stores subscription and invoice records; the app stores the customer association and entitlement state.

Only Checkout creation parameters changed in [server/billing.mjs](server/billing.mjs). This document is the only new file. Existing routes, authentication, database, webhook handling, and client initialization remain in place.

## Resources

- [Stripe test cards](https://docs.stripe.com/testing)
- [Stripe Checkout](https://docs.stripe.com/payments/checkout)
- [Stripe webhooks](https://docs.stripe.com/webhooks)
- [Stripe support](https://support.stripe.com)
- [Stripe MCP](https://docs.stripe.com/mcp)
