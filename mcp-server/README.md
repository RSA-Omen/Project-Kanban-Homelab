# Kanban MCP Server

Exposes Project Kanban as MCP tools so Cursor and other MCP clients can read and update projects and tasks.

## Tools

| Tool | Description |
|------|-------------|
| `kanban_list_projects` | List all projects (id, title, status, task count) |
| `kanban_get_project` | Get full project details including tasks |
| `kanban_list_tasks` | List tasks for a project (optional status filter) |
| `kanban_create_task` | Create a task in a project |
| `kanban_update_task_status` | Set task status (todo, in-progress, done) |
| `kanban_report_task_progress` | Report progress for agent-assigned tasks (progress, completed, blocked, review) |
| `kanban_create_project` | Create a new project |
| `kanban_update_project_status` | Move project to column (backlog, in-progress, review, done, cancelled) |
| `kanban_add_worklog_entry` | Add a work log entry to a project (for Cursor to record what was done) |
| `kanban_list_tasks_assigned_to_cursor` | List all tasks assigned to Cursor (includes branch, work_dir) |

## Setup

1. Install MCP package in kanban backend venv:
   ```bash
   cd ../backend && ./venv/bin/pip install 'mcp>=1.2.0'
   ```

2. Cursor MCP config is at `~/.cursor/mcp.json`. Ensure the kanban backend is running (default `http://localhost:5002`).

3. Restart Cursor after changing MCP config.

## Environment

- `KANBAN_BASE_URL` — API base URL (default: `http://localhost:5002/api`). Set if the backend runs elsewhere (e.g. `http://host.docker.internal:5002/api`).
