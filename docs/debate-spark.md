# Debate Spark: prompts + stats

## Where to add / edit questions

Update this file:

- `web_ui/debate-prompts.json`

Format:

```json
{
  "prompts": [
    "Question 1?",
    "Question 2?"
  ]
}
```

The booth loads these via `GET /api/debate-prompts` on startup.
If the file is missing/invalid, the UI falls back to built-in defaults.

## Where stats are recorded

Debate Spark writes vote/reset events to:

- `gallery/debate-stats.json`

Each vote sends `POST /api/debate-stats` with prompt, side, streak, heat, timestamp.

## How to read stats

Use:

- `GET /api/debate-stats`

Response includes:

- `path`: full file path used on disk
- `totalEvents`
- `summary`: per-prompt agree/disagree totals
- `events`: raw event history (capped to latest 5000)

## Quick checks

```bash
curl http://localhost:8080/api/debate-prompts
curl http://localhost:8080/api/debate-stats
```

## Enable/disable in booth settings

In the booth UI, open **Settings → Audio** and toggle **Enable Debate Spark widget**.

