"""
MCP server for Project Kanban. Exposes kanban operations as tools so
MCP clients can read and update projects and tasks.
"""

import json
import os
import sys

import requests
from mcp.server.fastmcp import FastMCP

BASE_URL = os.environ.get("KANBAN_BASE_URL", "http://localhost:5002/api")


def _get(path: str, **kwargs):
    r = requests.get(f"{BASE_URL}{path}", timeout=30, **kwargs)
    r.raise_for_status()
    return r.json()


def _post(path: str, json_data: dict = None, **kwargs):
    r = requests.post(f"{BASE_URL}{path}", json=json_data or {}, timeout=30, **kwargs)
    r.raise_for_status()
    return r.json() if r.content else {}


def _put(path: str, json_data: dict = None, **kwargs):
    r = requests.put(f"{BASE_URL}{path}", json=json_data or {}, timeout=30, **kwargs)
    r.raise_for_status()
    return r.json() if r.content else {}


def _patch(path: str, json_data: dict = None, **kwargs):
    r = requests.patch(f"{BASE_URL}{path}", json=json_data or {}, timeout=30, **kwargs)
    r.raise_for_status()
    return r.json() if r.content else {}


mcp = FastMCP(
    "Project Kanban",
    json_response=True,
)


@mcp.tool()
def kanban_list_projects() -> str:
    """List all projects from the kanban board. Returns project id, title, status, priority, and task count."""
    projects = _get("/projects")
    out = []
    for p in projects:
        tasks = p.get("tasks", [])
        out.append({
            "id": p["id"],
            "title": p["title"],
            "status": p.get("status", "backlog"),
            "priority": p.get("priority", "medium"),
            "task_count": len(tasks),
        })
    return json.dumps(out, indent=2)


@mcp.tool()
def kanban_get_project(project_id: str) -> str:
    """Get full details for a project including its tasks."""
    data = _get(f"/projects/{project_id}")
    return json.dumps(data, indent=2)


@mcp.tool()
def kanban_list_tasks(project_id: str, status_filter: str | None = None) -> str:
    """
    List tasks for a project. Optionally filter by status: todo, in-progress, done.
    """
    tasks = _get(f"/projects/{project_id}/tasks")
    if status_filter and status_filter.lower() in ("todo", "in-progress", "done"):
        tasks = [t for t in tasks if t.get("status") == status_filter.lower()]
    out = [
        {"id": t["id"], "title": t["title"], "status": t.get("status", "todo")}
        for t in tasks
    ]
    return json.dumps(out, indent=2)


@mcp.tool()
def kanban_create_task(
    project_id: str,
    title: str,
    description: str = "",
    status: str = "todo",
    priority: str = "medium",
) -> str:
    """Create a new task in a project."""
    data = _post(
        f"/projects/{project_id}/tasks",
        json_data={"title": title, "description": description, "status": status, "priority": priority},
    )
    return json.dumps(data, indent=2)


@mcp.tool()
def kanban_update_task_status(
    project_id: str,
    task_id: str,
    status: str,
) -> str:
    """Update a task's status. Valid values: todo, in-progress, done."""
    if status not in ("todo", "in-progress", "done"):
        return json.dumps({"error": "status must be todo, in-progress, or done"})
    data = _patch(f"/projects/{project_id}/tasks/{task_id}/status", json_data={"status": status})
    return json.dumps(data, indent=2)




@mcp.tool()
def kanban_create_project(
    title: str,
    description: str = "",
    status: str = "backlog",
    priority: str = "medium",
) -> str:
    """Create a new project on the kanban board."""
    data = _post(
        "/projects",
        json_data={"title": title, "description": description, "status": status, "priority": priority},
    )
    return json.dumps(data, indent=2)


@mcp.tool()
def kanban_add_worklog_entry(
    project_id: str,
    content: str,
    details: str = "",
    files: str = "",
) -> str:
    """
    Add a work log entry to a project. Use this to record what was done.
    files: optional comma-separated list of file paths that were changed.
    """
    payload = {"content": content, "type": "step", "author": "User"}
    if details:
        payload["details"] = details
    if files:
        payload["files"] = [f.strip() for f in files.split(",") if f.strip()]
    data = _post(f"/projects/{project_id}/worklog", json_data=payload)
    return json.dumps(data, indent=2)




@mcp.tool()
def kanban_update_project_status(project_id: str, status: str) -> str:
    """Update a project's column status. Valid: backlog, in-progress, review, done, cancelled."""
    if status not in ("backlog", "in-progress", "review", "done", "cancelled"):
        return json.dumps({"error": "status must be backlog, in-progress, review, done, or cancelled"})
    data = _patch(f"/projects/{project_id}/status", json_data={"status": status})
    return json.dumps(data, indent=2)


if __name__ == "__main__":
    mcp.run(transport="stdio")
