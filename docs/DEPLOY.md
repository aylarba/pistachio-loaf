# Deployment guide

The website is already live on GitHub Pages in demo mode. These steps turn on real ordering.
Nothing here costs money at a small bakery's volume. Venmo Business charges 1.9% + 10¢ per payment.

## 1. Venmo Business profile

In the Venmo app: **Me → your name at the top → Create a business profile**. Use the name Lowzineh and pick a username (e.g. `lowzineh`). Payments to this profile stay separate from your personal Venmo.

## 2. Tools on your Mac (one time)

```bash
brew install awscli aws-sam-cli
```

Create an AWS account at aws.amazon.com, then create access keys for the CLI:
AWS console → your name (top right) → **Security credentials** → **Create access key** (choose "Command Line Interface").

```bash
aws configure
# AWS Access Key ID:     (paste)
# AWS Secret Access Key: (paste)
# Default region name:   us-east-1
# Default output format: json
```

Keep the keys private; never commit or share them.

## 3. Make an admin key

This is the password for your order dashboard. Generate a long random one and save it in your password manager:

```bash
openssl rand -base64 24
```

## 4. Deploy the API

```bash
cd ~/Documents/pistachio-loaf/api
sam build
sam deploy --guided
```

Answer the prompts:

| Prompt | Answer |
|---|---|
| Stack Name | `lowzineh` |
| AWS Region | `us-east-1` |
| AllowedOrigins | `https://aylarba.github.io,http://localhost:5173` |
| VenmoUsername | your Venmo Business username, without `@` |
| AdminKey | the key from step 3 |
| OwnerEmail / FromEmail | press Enter to leave empty (email is optional) |
| PriceCents | `2400` = $24.00 |
| DeliveryFeeCents | `500` = $5.00 |
| DailyCapacity | loaves you can bake per day |
| LeadDays | days of notice you need, e.g. `2` |
| PaymentWindowHours | how long unpaid orders hold loaves, e.g. `3` |
| BakeDays | days you deliver, e.g. `5,6` = Friday and Saturday (0 = Sunday) |
| Confirm changes before deploy | `y` |
| Allow SAM CLI IAM role creation | `y` |
| Functions have no authentication. Is this okay? | `y` for each (the admin function checks the admin key itself) |
| Save arguments to configuration file | `y` |

When it finishes, copy the **ApiUrl** from the Outputs.

To change prices or days later: `sam deploy --parameter-overrides PriceCents=2600` (other values are remembered).

## 5. Connect the website to the API

GitHub → your repo → **Settings → Secrets and variables → Actions → Variables tab → New repository variable**:

- Name: `VITE_API_URL`
- Value: the ApiUrl from step 4

Then **Actions → Deploy website to GitHub Pages → Run workflow**. When it finishes, the order form is live.

## 6. Test an order end to end

1. Place an order on the site with your own details.
2. Tap **Pay with Venmo** and send it from your personal Venmo to your business profile (or have a friend do it).
3. Open `https://aylarba.github.io/pistachio-loaf/#admin`, enter your admin key, and mark the order paid, then delivered.
4. Place another order and don't pay. After the hold time it moves to **Expired** and the loaves become available again.

## Running orders day to day

- When a Venmo payment arrives, its note shows the order code (`LZ-…`). Find it under **Waiting for Venmo** and click **Mark paid**.
- **Paid, to deliver** is your delivery list, sorted by date, with addresses and phone numbers.
- To cancel a paid order, click **Cancel** and refund the customer in Venmo.

## Optional: order emails

Email needs a domain verified in Amazon SES. If you buy one later, verify it in SES, request production access, and redeploy with `FromEmail=orders@yourdomain.com` and `OwnerEmail=<your Gmail>`.
