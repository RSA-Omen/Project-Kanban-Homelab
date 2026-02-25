# Kanban MCP Server

Exposes Project Kanban as MCP tools so MCP clients can read and update projects and tasks.

## Tools

| Tool | Description |
|------|-------------|
| `kanban_list_projects` | List all projects (id, title, status, task count) |
| `kanban_get_project` | Get full project details including tasks |
| `kanban_list_tasks` | List tasks for a project (optional status filter) |
| `kanban_create_task` | Create a task in a project |
| `kanban_update_task_status` | Set task status (todo, in-progress, done) |
| `kanban_create_project` | Create a new project |
| `kanban_update_project_status` | Move project to column (backlog, in-progress, review, done, cancelled) |
| `kanban_add_worklog_entry` | Add a work log entry to a project |

## Setup

1. Install MCP package in kanban backend venv:
   ```bash
   cd ../backend && ./venv/bin/pip install 'mcp>=1.2.0'
   ```

2. MCP client config varies by client. Ensure the kanban backend is running (default `http://localhost:5002`).

3. Restart MCP client after changing configuration.

## Environment

- `KANBAN_BASE_URL` — API base URL (default: `http://localhost:5002/api`). Set if the backend runs elsewhere (e.g. `http://host.docker.internal:5002/api`).
