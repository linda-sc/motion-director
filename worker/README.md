# Sketch-generation proxy (Cloudflare Worker)

Holds the Anthropic API key and rate-limits public sketch generation so the
hosted demo can't be abused. The browser never sees the key.

## Limits (edit at the top of `generate.js`)
- `DAILY_CAP = 100` — hard ceiling on model calls per UTC day (~$1.50/day worst case).
- `PER_IP_HOURLY = 5` — generations per IP per hour.
- `MODEL`, `MAX_TOKENS` — pinned server-side; clients can't change them.
- `ALLOWED_ORIGINS` — only these origins are served (CORS lock).

## Deploy (one time)
Run these from `worker/`. Install wrangler first if needed: `npm i -g wrangler`.

```sh
wrangler login                              # opens a browser
wrangler kv namespace create LIMITS         # prints an id — paste it into wrangler.toml
wrangler secret put ANTHROPIC_API_KEY       # paste your key when prompted (stored encrypted)
wrangler deploy                             # prints the Worker URL
```

Copy the deployed URL (e.g. `https://motiondirector-generate.<you>.workers.dev`)
into `GENERATE_PROXY_URL` in `src/app.js`, then commit + push so GitHub Pages
rebuilds. The "Suggest sketch" button then works on the live site, capped.

## Updating limits later
Edit `generate.js` and re-run `wrangler deploy`. To rotate the key:
`wrangler secret put ANTHROPIC_API_KEY` again.

## Check usage
`wrangler tail` streams live logs. Today's global count:
`wrangler kv key get --binding LIMITS "global:$(date -u +%F)"`
