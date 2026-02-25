# Project Kanban + AI Assistant

Kanban board with project work log, optional Asana sync, and AI/task integrations.

## Quick start

```bash
./run.sh
```

- **Frontend:** http://localhost:8085 (React app; use this for full API-backed Kanban)
- **Backend:** http://localhost:5002

Static-only (no backend) version: open `index.html` in the project root in a browser. Data is stored in localStorage.

## WSL setup

The app runs on WSL without any work-machine dependencies:

- **Asana** and **project-manager sync** are optional. If `pm_tools` or `projects.json` are not present, those features are disabled and the API still serves projects/work log from `backend/data.json`.
- **Cursor** is used for task execution: assign in the UI, then open Cursor and say "work on my assigned kanban tasks". Cursor uses MCP to update tasks and work log.
- **Branches**: When assigning, a `kanban/task-id` branch is created (if codeDir is a git repo). Approve merges; Revert discards the branch.
- **Autonomous scheduler**: Every 30 min (configurable), finds unassigned doable tasks and assigns them to Cursor.

Optional env vars (set only if you use them):

| Variable | Purpose |
|----------|--------|
| `KANBAN_ASANA_HOME` | Directory containing `pm_tools` (for Asana integration). Default: `$HOME`. |
| `PROJECTS_JSON` | Path to `projects.json` for sync-from-PM and wizard. Unset = no sync. |
| `ANTHROPIC_API_KEY` | For Cursor Crawler task suggestions. |
| `AUTONOMOUS_ENABLED` | 1 = run scheduler (default). 0 = disabled. |
| `AUTONOMOUS_INTERVAL_MINUTES` | How often to check (default 30). |
| `AUTONOMOUS_MAX_PER_RUN` | Max tasks to assign per run (default 1). |

Data is stored in `backend/data.json`. No DB required.

## Cloud agents (MCP)

The `mcp-server/` exposes kanban as MCP tools so Cursor and other MCP clients can read/update projects and tasks. See `mcp-server/README.md`. Cursor config: `~/.cursor/mcp.json`.
# Project-Kanban-Homelab
