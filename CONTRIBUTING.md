# Contributing to Project Kanban

## Development Setup

1. Clone the repository
2. Run `./run.sh` to start both frontend and backend
3. Frontend runs at http://localhost:8085
4. Backend API runs at http://localhost:5002

## Project Structure

```
.
├── backend/        # Python Flask API
├── frontend/       # React frontend
├── mcp-server/     # MCP integration for Cursor
├── docs/           # Project documentation
├── index.html      # Static version (no backend)
└── run.sh          # Start script
```

## Making Changes

1. Create a feature branch from `main`
2. Make your changes
3. Test locally with `./run.sh`
4. Submit a pull request

## Code Style

- Backend: Follow PEP 8 for Python code
- Frontend: Use consistent JSX formatting
- Keep functions small and focused
- Add comments for non-obvious logic

## MCP Integration

The `mcp-server/` directory exposes Kanban functionality to Cursor and other MCP clients. See `mcp-server/README.md` for setup.

## Optional Features

- Asana sync requires `PROJECTS_JSON` and `pm_tools`
- Autonomous scheduler controlled via `AUTONOMOUS_ENABLED`
- See README.md for all environment variables
