# LeadGen AI

Starter scaffold for LeadGen AI — a SaaS outreach platform.

Run:

1. Install deps: `npm install`
2. Add `.env.local` from `.env.local.example`
3. Run: `npm run dev`
# n8n Example Workflow

This folder contains a simple n8n workflow example: an HTTP webhook trigger that passes data to a Function node and then sends it to an external HTTP endpoint.

Files:
- `n8n-workflow.json`: Importable n8n workflow JSON (single workflow).

How to import into n8n:
1. In n8n, go to Workflows → Import from File.
2. Choose `n8n-workflow.json`.
3. Configure credentials if needed and activate the workflow.

Testing the webhook locally:
- If running n8n locally, use a tool like `curl` or Postman to POST to `http://localhost:5678/webhook`.

Example `curl`:

```bash
curl -X POST http://localhost:5678/webhook -H "Content-Type: application/json" -d '{"foo":"bar"}'
```
