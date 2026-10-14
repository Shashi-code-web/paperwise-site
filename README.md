# Paperwise

Paperwise is a static storefront for digital PDF editions. The customer-facing pages are hosted on Cloudflare Pages, the API is deployed separately on Vercel, Supabase provides authentication and the database, and PDF files live in a private Supabase Storage bucket.

## Current customer flow

1. Browse active editions in the catalogue and add one or more to the bag.
2. Create an account or sign in with Supabase Auth.
3. Submit a UPI transaction reference for manual review. Paperwise does **not** automatically verify a UPI payment.
4. An authorized administrator verifies the transaction in the payment app and explicitly approves or rejects the order.
5. After approval, the customer can request a short-lived signed download URL for the PDF.

## Main locations

- Storefront: https://paperwise-store.pages.dev
- Admin console: https://paperwise-store.pages.dev/admin.html
- API project: https://paperwise-api.vercel.app
- Supabase project reference: `sweoiivfmgvekuhtcuiz`

## Repository map

- `index.html`, `styles.css`, `app.js`, `phonepe-qr.js`, `assets/`: storefront and customer checkout.
- `admin.html`, `admin.css`, `admin.js`: administrator console, MFA, catalogue management and manual order review.
- `api/`: Vercel API handlers for catalogue, checkout, order history, downloads and admin actions.
- `supabase/schema.sql`: bootstrap schema for a **new** Supabase project.
- `supabase/migrations/`: incremental changes for an existing database.
- `config.js`: browser-safe Supabase publishable key and API base URL only. Never put service-role credentials here.

## Before accepting customers

Replace the placeholder support contact in `contact.html` with a monitored address. Confirm that the UPI ID, payee name and QR image match the intended merchant account. Verify the private bucket, Auth email settings, the administrator role and MFA, and all production environment variables. Do not use a real payment as a smoke test.

For deployment and operations, see [SETUP.md](SETUP.md). For actual routes and security boundaries, see [IMPLEMENTATION.md](IMPLEMENTATION.md).


## AI assistants (optional)

- The storefront includes a floating Paperwise Help assistant. Signed-in customers can ask about their own manual-order status; guests receive public catalogue and checkout help.
- The authenticated admin console includes a read-only AI Copilot for aggregate sales, pending manual submissions, catalogue information and recorded download-link activity. It cannot approve payments or alter data.
- API routes: `POST /api/ai/customer-chat` and `POST /api/ai/admin-assistant`. The browser never sends prompts directly to OpenAI.
- Configure `OPENAI_API_KEY` and `OPENAI_MODEL` as server-side Vercel environment variables for `paperwise-api`. Select a model enabled for your OpenAI API account; the code has no default model. If either variable is missing, AI returns a setup message while catalogue, account, manual checkout and downloads remain independent.
- Review and apply `supabase/migrations/20261014000100_paperwise_ai_controls.sql` incrementally to the existing database before enabling AI. It creates shared rate-limit controls and a database-side sales aggregate. Do not run `supabase/schema.sql` against production.
- Install dependencies with `npm install` and run `npm test` for the AI security contract tests.
