# Deployment guide

Order of steps: domain → API → Stripe webhook → email → website → custom domains.
Do everything in **Stripe test mode** first, place a test order end to end, then switch to live keys.

## 1. Buy a domain

Register a domain (Cloudflare, Porkbun, or Namecheap). This guide uses `yourbakery.com`:

- `yourbakery.com` → website (Vercel)
- `api.yourbakery.com` → API (AWS)

## 2. Deploy the API to AWS

Prerequisites: an AWS account, the [AWS CLI](https://docs.aws.amazon.com/cli/) configured (`aws configure`), and the [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html).

```bash
cd api
npm install
sam build
sam deploy --guided
```

The guided deploy asks for each parameter:

| Parameter | Example |
|---|---|
| Stack name | `pistachio-loaf` |
| Region | `us-east-1` |
| SiteUrl | `https://yourbakery.com` |
| AllowedOrigins | `https://yourbakery.com,https://www.yourbakery.com,http://localhost:5173` |
| StripeSecretKey | `sk_test_...` (Stripe Dashboard → Developers → API keys) |
| StripeWebhookSecret | `whsec_placeholder` for now (step 3 gives the real one) |
| OwnerEmail | where you want order notifications |
| FromEmail | `orders@yourbakery.com` |
| PriceCents | `2400` = $24.00 |
| DeliveryFeeCents | `500` = $5.00 |
| DailyCapacity | loaves you can bake per day |
| LeadDays | days of notice you need |
| BakeDays | `5,6` = Friday and Saturday only (0 = Sunday) |

Note the outputs `ApiUrl` and `WebhookUrl`.

## 3. Connect the Stripe webhook

1. Stripe Dashboard → Developers → Webhooks → Add endpoint.
2. Endpoint URL: the `WebhookUrl` output.
3. Events: `checkout.session.completed` and `checkout.session.expired`.
4. Copy the signing secret (`whsec_...`) and redeploy with it:

```bash
sam deploy --parameter-overrides StripeWebhookSecret=whsec_your_real_secret
```

(`sam deploy` remembers the other values in `samconfig.toml`, which is git-ignored.)

## 4. Set up email (Amazon SES)

1. SES console → Identities → Create identity → Domain → `yourbakery.com`. Add the DNS records it shows at your registrar.
2. New SES accounts are in a sandbox and can only email verified addresses. Request production access (SES → Account dashboard) so customers receive receipts.

## 5. Deploy the website (Vercel)

1. Push this repo to GitHub.
2. In [Vercel](https://vercel.com): Add New → Project → import the repo.
3. Root directory: `web`. Framework: Vite.
4. Environment variable: `VITE_API_URL` = your `ApiUrl` (or `https://api.yourbakery.com` after step 6).
5. Deploy. Every push to `main` redeploys automatically.

## 6. Custom domains

**Website:** Vercel → Project → Settings → Domains → add `yourbakery.com` and `www.yourbakery.com`. Add the DNS records Vercel shows at your registrar. HTTPS is automatic.

**API:**

1. AWS Certificate Manager (same region as the API) → request a public certificate for `api.yourbakery.com` → validate with the DNS record it shows.
2. API Gateway → Custom domain names → create `api.yourbakery.com` with that certificate.
3. API mappings → map it to the `pistachio-loaf` HTTP API, stage `$default`.
4. At your registrar, add a CNAME: `api` → the API Gateway domain name shown on that page.
5. Update Vercel's `VITE_API_URL` to `https://api.yourbakery.com` and redeploy the site. Update the Stripe webhook URL to `https://api.yourbakery.com/stripe/webhook`.

## 7. Go live

- Place a full test order with Stripe's test card `4242 4242 4242 4242`. Check that the order appears in DynamoDB as `paid` and both emails arrive.
- Let a checkout expire (or wait 30 minutes) and confirm the day's capacity is released.
- Switch to live Stripe keys: redeploy with the live `StripeSecretKey`, create a live-mode webhook, and redeploy with its secret.
- Fill in `web/src/site.js`, add your photo, and retake the screenshots in `docs/screenshots/`.

## Costs at small scale

Lambda, API Gateway, and DynamoDB are effectively free at a few hundred orders a month. Expect the domain (~$10–15/year), Stripe fees (2.9% + 30¢ per card payment), and $99/year for the Apple Developer Program if you publish the app.
