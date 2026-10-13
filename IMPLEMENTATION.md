# Paperwise implementation and security boundaries

## Current payment model

Paperwise currently accepts **manual UPI submissions**. It does not use a live card processor, automatic payment confirmation, or a payment-provider webhook in this repository. Customers submit a transaction reference; the administrator must independently match the transaction and amount in the payment app before marking the order paid. A submitted reference is not proof of payment.

## Customer journey

1. `GET /api/products` returns active catalogue items and whether manual checkout is enabled.
2. Customer registration, login and 6-digit email verification use Supabase Auth in the browser.
3. `POST /api/checkout` requires a valid user session, checks that 1–10 distinct active product IDs exist, computes the total from database prices, checks that manual checkout is enabled, and records a pending order plus its items. Normalized transaction references are unique.
4. `GET /api/manual-orders` and `GET /api/library` return the signed-in customer's own order information and paid purchases.
5. `POST /api/admin-manual-orders` requires an administrator role and a verified AAL2 session; it permits only pending manual orders and uses a conditional update to avoid double-review.
6. `POST /api/download` and the legacy `POST /api/downloads/:orderItemId` route verify ownership of a paid order before returning a signed URL. The `private-pdfs` bucket must remain private; generated download URLs expire after ten minutes.

## Admin and product routes

- `GET/POST/PATCH/DELETE /api/admin-products`: administrator-only catalogue management and metrics.
- `POST /api/admin/upload`: administrator-only signed upload setup for PDFs up to 50 MB.
- `GET/PATCH /api/admin/products` and `GET /api/admin/stats`: retained legacy endpoints; they use the same administrator authorization boundary.
- `GET/POST /api/payment-settings`: administrator-only settings, with AAL2 required for both reading and changing the setting.

The server uses `SUPABASE_SERVICE_ROLE_KEY` only inside API handlers after authorization. Do not put that key in browser assets. Browser CORS is restricted to the known storefront origins.

## Data and storage

- `products.price_paise` and order totals are integer paise; display formatting must not round them to whole rupees.
- `orders.status` stays pending until manual payment approval; rejection marks the order failed.
- Source PDFs are stored in Supabase Storage bucket `private-pdfs`, not in the public website directory.
- `download_tokens` records download-link issuance and expiry. It is an audit record; the signed Storage URL is the capability that grants temporary download access.
- `manual_payment_settings`, `download_tokens` and `webhook_events` are server-only tables protected from browser clients by RLS.

## Pre-launch tasks

A real support address must replace the placeholder on `contact.html`. The store owner must independently verify the displayed UPI destination and QR, review the privacy/terms/refund text, confirm Supabase email delivery and rate limits, and complete a safe end-to-end test plan without charging real money or fabricating payment references.


## Optional AI assistant architecture

`POST /api/ai/customer-chat` and `POST /api/ai/admin-assistant` are distinct server-side Responses API routes. The official `openai` JavaScript SDK reads only `OPENAI_API_KEY` and `OPENAI_MODEL` from Vercel server environment. The browser never receives the API key and Responses are requested with `store: false`.

The customer route permits guests only for public catalogue and checkout-status context. A valid Supabase bearer session is required for order-status tools; the query is scoped to that verified user ID and does not return order identifiers or payment references to the model. The admin route invokes `requireAdmin` on every request, including checking the profile role and Supabase JWT `aal2` assurance level. No AI tool mutates data or reviews a payment.

Function arguments are validated against a named allowlist; product facts come from the active catalogue; aggregate sales are computed in SQL; pending submission summaries omit personal identifiers and UPI references. Untrusted user/history/catalogue text is bounded and basic secret-like data is redacted before model input. Requests, chat turns, model output, and tool loops have limits. Shared rate limits depend on the incremental migration function `consume_ai_rate_limit`; database control failures cause the AI routes to fail closed, not the store. `ai_sales_summary` is a read-only database aggregate used only by authorized server code.

The AI chat history exists only in page memory during the active page session; the implementation does not persist conversation history to localStorage or a chat database. Do not add user-facing write tools without separate validated endpoints, explicit confirmation, role/MFA checks, and auditable backend confirmation.


Successful AI calls emit a minimal Vercel runtime log with only the assistant role, configured model name, and input/output token counts for cost monitoring. Prompt text, generated reply text, customer identifiers and payment data are not logged.
