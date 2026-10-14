# Paperwise production setup

Paperwise uses **manual UPI review**, not a Razorpay checkout or payment webhook. A transaction reference is a claim submitted by the customer; it does not make an order paid. Only an administrator who checks the payment independently can approve an order and unlock the PDF.

## Hosting

1. **Cloudflare Pages — storefront:** connect this repository and deploy the `main` branch from the repository root. The production site is `https://paperwise-store.pages.dev`.
2. **Vercel — API:** use the `paperwise-api` project, connected to this repository and the `main` branch. Deploy from the repository root so the `api/` handlers and `vercel.json` are included.
3. **Vercel environment variables:** configure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` for Production. The service-role key must remain server-side; never commit it, return it from an API route, or place it in `config.js`.

## Supabase

1. For a **brand-new** project only, review and run `supabase/schema.sql`. For the existing production database, apply only the reviewed incremental files in `supabase/migrations/`; do not rerun the bootstrap schema over live data.
2. Create a Storage bucket named `private-pdfs`, set it to **private**, and configure upload-size limits to match the 50 MB upload limit used by the admin UI.
3. Enable email/password Auth and configure the Site URL and allowed redirect URLs for the Cloudflare Pages domain. Test delivery of the 6-digit signup verification email and check Auth rate limits.
4. Create the intended administrator's profile row with `role = 'admin'` after verifying the Supabase user ID. Require TOTP MFA; admin API calls require the verified AAL2 session.
5. Keep the service-role key in Vercel only. The browser-side publishable key in `config.js` is not a service-role credential.

## Manual UPI checkout

1. Confirm the payee name, UPI ID and QR image belong to the intended payment account. The storefront's UPI deep link is in `phonepe-qr.js`; the visible destination and QR asset are referenced by `index.html` and `assets/phonepe-qr.webp`. Keep them consistent.
2. Confirm the `manual_payment_settings` row with `id = 1` is disabled while configuration is incomplete. Enable submissions from the authenticated admin console only after verifying the destination.
3. Customers may submit a transaction reference once; the database's normalized unique index prevents reuse. Submissions remain pending until an administrator verifies the actual transaction and amount in the payment app.
4. Do not approve a payment based on a screenshot alone. Never request a UPI PIN, password or one-time code from a customer.

## Deployment verification

After each release, inspect the Git commit and hosting build status. Smoke-test the storefront pages, responsive layout, catalogue request, add/remove bag, auth and OTP UX, disabled-checkout state, admin role/MFA gate, product upload validation, payment submission validation, approval/rejection, customer ownership checks on downloads, and 10-minute signed-link expiry. Do not create a fake transaction ID, submit a real payment, or approve a test order in production just to test the path.

## Launch blocker

Publish a real, monitored support address on the contact page before inviting customers. Review all public policies for the operating entity and actual refund process.


## Optional OpenAI assistants

1. In Vercel Project Settings for `paperwise-api`, add `OPENAI_API_KEY` as an encrypted server-only environment variable and `OPENAI_MODEL` as the model name enabled for your OpenAI API project. Add them to the Production environment, and Preview only if you intend to test AI on previews. Never place the OpenAI key in `config.js`, HTML, or browser storage. Do not paste its value into GitHub or chat.
2. The application intentionally has no guessed model fallback. If either variable is missing or OpenAI returns an error, the assistant shows a safe setup/retry message; existing checkout and download routes are separate and continue operating.
3. Review and apply `supabase/migrations/20261014000100_paperwise_ai_controls.sql` as an incremental migration to the existing production database before exposing AI. It creates an RLS-protected shared limiter table and a service-role-only consume function, plus a restricted sales summary function. Do not rerun the bootstrap `supabase/schema.sql` or reset production.
4. In the repository workspace, install dependencies using `npm install` to install the official `openai` JavaScript SDK, then run `npm test` and the existing JavaScript syntax/local-asset checks. Confirm the CI run for the exact commit before promoting deployment.
5. The admin Copilot is read-only: payment verification, catalogue changes, payment settings and file access remain existing human-controlled application flows. Review all assistant output and independently verify transactions in the payment app.
