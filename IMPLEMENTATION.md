# Paperwise implementation notes

This storefront is a front-end demonstration. Its `Secure checkout` button must be connected to server routes before it can accept payments or deliver files.

## Recommended production design

- Use **Razorpay** (or Cashfree) for India-supported payments. Create orders only from a server endpoint, in INR, with the authoritative product price (₹59), and open the provider checkout using only its publishable key.
- Merchant bank-account linking, KYC, payout settings, and provider verification belong in the merchant's Razorpay/Cashfree dashboard. Do not collect bank information on this public site.
- On the server, verify the payment signature and also validate the provider webhook signature using the webhook secret held only in environment variables. Make fulfillment idempotent by recording the provider event/payment ID before issuing access.
- Store source PDFs in a private bucket (for example, S3/R2 private storage), never under the public web root. After the verified webhook marks an order `paid`, issue a short-lived signed download URL or a single-use download token from an authenticated server endpoint.
- The download endpoint must check the signed-in customer owns the paid order. Rate-limit it and log issuance/download attempts. Do not generate a download from browser code.
- Keep payment secrets, webhook secrets, database credentials, and storage signing keys in the deployment secret manager; never commit them or expose them in client JavaScript. The site should neither accept nor store card details.

## Core data model

`users`: id, email, password_hash / provider_id, two_factor_enabled, created_at

`products`: id, title, description, price_paise, cover_asset_key, pdf_asset_key, active, updated_at

`orders`: id, user_id, amount_paise, currency, status, provider_order_id, provider_payment_id, paid_at

`order_items`: id, order_id, product_id, unit_price_paise

`webhook_events`: provider_event_id (unique), payload_hash, received_at, processed_at

`download_tokens`: id, order_item_id, token_hash, expires_at, used_at

## Routes and access controls

- `POST /api/checkout`: authenticated user; validates cart/product IDs and prices server-side; creates provider order.
- `POST /api/webhooks/razorpay`: public endpoint; raw-body HMAC verification before processing; idempotent.
- `GET /api/me/orders`: authenticated user; returns only their orders.
- `POST /api/downloads/:orderItemId`: authenticated owner of a `paid` order; returns an expiring signed URL.
- `/admin/*`: administrator role plus TOTP/WebAuthn second factor, secure session cookies, CSRF protection, audit logging and rate limits. Admins upload PDFs to private storage, edit product content/₹ price, and view/manage sales; they never see card details.

## Public-policy pages

Create `/privacy`, `/terms`, `/refunds`, and `/contact` server pages with your business identity and a reviewed policy before launch. The footer in this demo intentionally links to these pages; their final legal copy should be reviewed for the jurisdiction and actual refund practice.
