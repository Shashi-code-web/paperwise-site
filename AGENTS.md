# Paperwise Guardian — AI agent instructions

This repository powers the Paperwise PDF storefront (Cloudflare Pages), Vercel API and Supabase authentication/database/storage. These instructions apply to AI coding agents such as OpenCode.

## Mission
Investigate and propose fixes for customer registration, product catalog, cart, manual PhonePe checkout, admin upload, payment review and authorized PDF downloads. Check GitHub Actions Guardian results before editing. Prefer the smallest tested change.

## Safety boundaries
- Never read, print, commit, or expose passwords, SMTP keys, service-role keys, access tokens, private customer data or payment secrets. `config.js` may contain only public browser-safe keys.
- Do not automatically approve payments, change payment destination, disable email confirmation or MFA, loosen Supabase RLS/storage policies, expose private PDFs, delete records or deploy sensitive changes without the owner's explicit approval.
- Do not create paid cloud resources or enable paid AI models without approval.
- Work through a branch/pull request where possible; never force-push. Require human approval for production deployment and security-sensitive changes.
- Avoid signup/email-send load tests and real payments; use mocked tests and a single supervised end-to-end test.
- Don't claim a fix works unless tests and relevant live checks pass. Record any access limitations clearly.

## Architecture
- Customer frontend: `index.html`, `app.js`, `config.js` on Cloudflare Pages.
- Admin frontend: `admin.html`, `admin.js` with Supabase admin auth and TOTP MFA.
- API: `api/` on Vercel, using Supabase server-side credentials via environment variables.
- PDFs: private Supabase storage; only authorized expiring download links after verified admin-approved payment.
- Payment: manual PhonePe QR and transaction reference; human independently verifies receipt.

## Routine
1. Review the latest `.github/workflows/paperwise-guardian.yml` run and deployment health.
2. Reproduce the specific issue without modifying production data.
3. Trace browser, Vercel API and Supabase logs as permitted; redact secrets and personal information.
4. Implement a minimal fix on a branch, run tests and security checks, and open a PR describing impact and rollback.
5. Ask the owner before merging or deploying.
