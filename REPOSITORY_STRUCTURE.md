# Gazi Repository Structure

This file is a handoff note for future agents and developers. Read this before making branch or folder decisions.

## Canonical GitHub Repository

- Remote: `https://github.com/mehedi2283/gazi.git`
- Production branch: `main`
- Milestone 2 branch: `feature/linkedin-outreach`

## Local Folder Map On This Machine

These folders existed on `D:\Work\Web App` when this note was created:

| Folder | Git status | Purpose |
| --- | --- | --- |
| `Gazi_main_push_delete_update` | Git repo on `main` | Clean main worktree used for production fixes and pushes. |
| `Gazi_push_tmp` | Git repo on `feature/linkedin-outreach` | Milestone 2 / LinkedIn outreach worktree. It may contain local uncommitted changes. |
| `Gazi` | Not a git repo | Loose app folder used during local work. Do not treat it as the source of truth for branch state. |

## Current Branch Meaning

### `main`

Use this branch for production-safe email outreach fixes.

Recent important commits:

- `0908adf Add campaign upload status feedback`
- `b381290 Add safe campaign delete RPC`
- `1ffbe10 Modernize campaign form UI`
- `dc6c455 Improve campaign delete feedback`
- `06a762c Fix Instantly schedule and sender lookup`

Important production changes currently on `main`:

- Campaign delete uses the safe Supabase RPC migration.
- Campaign delete UI closes the modal, marks the row as deleting, then briefly shows deleted before the row disappears.
- Campaign lead upload status is tracked through `campaigns.upload_status`.
- Campaign list and campaign details pages show live upload/upload-finished feedback.
- Webhook calls only wait briefly for an acknowledgment so long-running n8n workflows can continue in the background.

### `feature/linkedin-outreach`

Use this branch for Milestone 2 / LinkedIn outreach work.

Known pushed milestone commits:

- `8709999 Add LinkedIn outreach campaign flow`
- `68153d8 Add HeyReach account tracking for LinkedIn campaigns`
- `db8db3f Polish LinkedIn campaign creation flow`

Before working on this branch, run:

```bash
git fetch origin
git status --short --branch
```

If the branch is behind remote, pull/rebase only after preserving or reviewing any local changes.

## Database Notes

Main currently expects these important Supabase migrations:

- `supabase/migrations/20260615000000_add_safe_campaign_delete_rpc.sql`
- `supabase/migrations/20260615010000_add_campaign_upload_status.sql`

The upload-status migration is idempotent:

```sql
alter table public.campaigns
  add column if not exists upload_status text;

create index if not exists campaigns_upload_status_idx
  on public.campaigns (upload_status);
```

For long-running lead upload workflows, n8n should respond to the webhook immediately, continue the upload in the background, then update Supabase at the end:

```sql
update public.campaigns
set upload_status = 'upload_finished',
    total_leads = <final_uploaded_count>,
    updated_at = now()
where id = <campaign_id>;
```

Use `lead_uploading` while uploads are running and `upload_failed` only for real failures.

## Safe Workflow For Future Agents

1. For production fixes, work from a clean clone/worktree of `main`.
2. For Milestone 2, work from `feature/linkedin-outreach`.
3. Never assume `D:\Work\Web App\Gazi` is a git branch. It is not a git repo.
4. Before pushing, always run:

```bash
git status --short --branch
git diff --stat
npm exec tsc -- --noEmit
```

5. Do not push a branch with unrelated modified files. Commit only the files that belong to the current task.
