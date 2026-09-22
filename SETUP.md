# Production setup

1. Create a Supabase project, run `supabase/schema.sql`, create a **private** Storage bucket named `private-pdfs`, and enable email/password or magic-link auth.
2. Create a Razorpay account and complete KYC/bank payout setup in the Razorpay merchant dashboard. Do not add bank fields to the website.
3. Create a webhook for `payment.captured` pointing to `https://your-domain/api/webhooks/razorpay`; keep its secret only in the host's environment settings.
4. Deploy to Vercel and set every server-only value from `.env.example` in the deployment secret manager. Never commit a populated `.env` file.
5. Configure at least one administrator account by adding their Supabase user ID to `profiles` with role `admin`, then require TOTP or WebAuthn in your chosen identity provider before serving `/admin`.

The client should call `POST /api/checkout` only after a customer session is established, then open Razorpay Checkout using the returned public `keyId` and `razorpayOrderId`. Never mark an order paid in the client: only the signed Razorpay webhook may do that.
