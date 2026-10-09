# Enjazati Automation Center — Starter (safe sandbox)

Branch: `feature/automation-center-starter`. This branch DOES NOT change the public website or AppSheet.

## What is implemented
- Importable n8n workflow: `workflows/01-saudi-topic-discovery.json`.
- Manual research trigger and scheduled 08:00 Asia/Riyadh trigger (workflow initially **inactive**).
- Saudi Arabic news-discovery RSS query for Qiwa, Balady, Najiz, Absher and Musaned.
- Filtering, deduplication and a small relevance score.
- Explicit `UNVERIFIED` and `publish_allowed=false` output. This finds candidate topics only.

## What is NOT implemented
- Official-government-source verification or trend-volume measurement.
- Gemini/OpenAI generation (subscriptions do not automatically grant free API access).
- Asset creation, video generation, approval UI, Google Sheets output, or social publishing.
- WhatsApp Status / Community publishing.
- A running n8n server, provider credentials, or any paid product.

## Import and first test
1. Start an n8n **self-hosted Community Edition** instance on infrastructure you control.
2. In n8n, import `workflows/01-saudi-topic-discovery.json` as a workflow.
3. Keep the workflow INACTIVE. Click **Test workflow** / manual trigger.
4. Inspect output of `Deduplicate and Mark UNVERIFIED`; **do not publish** or infer an official rule from the coverage.
5. The schedule is set to 08:00 Asia/Riyadh; activate only after review. In case of a timezone mismatch, set the instance's timezone to Asia/Riyadh too.

## Next production modules
1. Resolve discovery topics to current primary official government sources, recording claim, URL, publication/effective date and confidence; route unresolved claims to manual review.
2. Separate evergreen service advertising from updates and WhatsApp Community briefings.
3. Build a content database and approval interface; all content must be approved before publishing.
4. Connect permitted Meta publishing APIs after testing account eligibility and permissions; Snapchat via supported publisher; prepare WhatsApp packages for manual posting.
5. Add analytics, deduplication, spend caps, audit logs, and failure alerts.
6. Add customer email and outreach separately after access and consent review.

## Hosting caveat
The current `malminhali/enjazati` repository includes a static `index.html` homepage; that does **not** establish an always-on Docker server. No n8n instance has been installed yet. GitHub Pages/static hosting cannot run n8n server processes.

## Security
Do not commit API keys, social tokens, OAuth credentials, private customer records, or live AppSheet data to GitHub. Restrict any eventual admin dashboard to authenticated users. No auto-publication without approval.
