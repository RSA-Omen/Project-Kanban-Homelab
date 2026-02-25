# Project Kanban

Kanban board with project work log and optional Asana sync.

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

Optional env vars (set only if you use them):

| Variable | Purpose |
|----------|--------|
| `KANBAN_ASANA_HOME` | Directory containing `pm_tools` (for Asana integration). Default: `$HOME`. |
| `PROJECTS_JSON` | Path to `projects.json` for sync-from-PM and wizard. Unset = no sync. |

Data is stored in `backend/data.json`. No DB required.

## MCP Integration

The `mcp-server/` exposes kanban as MCP tools so MCP clients can read/update projects and tasks. See `mcp-server/README.md`.
# Project-Kanban-Homelab
