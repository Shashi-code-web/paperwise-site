# Paperwise OpenCode Guardian setup

The repository now contains the OpenCode project configuration, the Paperwise Guardian agent, a health-review command, and a GitHub Actions integration.

## One-time connection

1. Install the official OpenCode GitHub App on the Paperwise repository:
   https://github.com/apps/opencode-agent

2. In GitHub repository **Settings → Secrets and variables → Actions**, add the API credential required by the model provider you choose. Supported environment names in the workflow are:
   - `OPENCODE_API_KEY`
   - `OPENAI_API_KEY`
   - `ANTHROPIC_API_KEY`
   - `GEMINI_API_KEY` (mapped to `GOOGLE_GENERATIVE_AI_API_KEY`)

3. Add a repository variable named `OPENCODE_MODEL` with the exact OpenCode model ID you want to use, for example `provider/model-id`.

4. For local OpenCode use, authenticate the three remote MCP servers from the project directory:
   - Cloudflare: `opencode mcp auth cloudflare`
   - Vercel: `opencode mcp auth vercel`
   - Supabase: `opencode mcp auth supabase`

   The Supabase MCP configuration is project-scoped to Paperwise and read-only.

## How to use it

- In a GitHub issue or pull request comment, an owner can write `/opencode` followed by the task.
- Or manually run **Actions → OpenCode Paperwise Guardian → Run workflow**.
- For a local health review, run `/paperwise-health` in OpenCode.

## Safety

The Guardian is configured to ask before edits and before Cloudflare, Vercel, or Supabase MCP actions. It is not allowed to push directly. Payment approval, MFA/email-confirmation changes, private PDF exposure, destructive data changes, and payment-destination changes remain owner-controlled.
