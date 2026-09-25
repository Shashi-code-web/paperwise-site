---
description: Run a cross-service Paperwise health and security review
agent: paperwise-guardian
---

Run a Paperwise Guardian health review.

Check:
- GitHub repository status and recent Guardian workflow results.
- Cloudflare Pages storefront availability/deployment health.
- Vercel paperwise-api deployment health and relevant errors.
- Supabase project health, Auth logs, database/storage health, and recent relevant errors.
- Customer registration/login, cart/checkout, admin upload, manual payment review, and authorized PDF download paths in source code.

Do not send test emails, process real payments, mutate production customer/order data, expose private PDFs, or change security-sensitive settings.

Return:
1. Findings grouped by severity.
2. Root cause for each confirmed issue.
3. Safe fixes that can be applied now.
4. Items requiring the owner's approval.
5. Verification performed and anything still unverified.
