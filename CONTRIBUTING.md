# Contributing to Project Kanban Homelab

Thanks for your interest in contributing to this project.

## Development Setup

1. Clone the repository:
```bash
git clone https://github.com/RSA-Omen/Project-Kanban-Homelab.git
cd Project-Kanban-Homelab
```

2. Run the application:
```bash
./run.sh
```

The frontend will be available at http://localhost:8085 and the backend at http://localhost:5002.

## Project Structure

- `frontend/` - React-based UI
- `backend/` - Flask API server
- `mcp-server/` - MCP tools for Cursor integration
- `index.html` / `app.js` / `styles.css` - Static standalone version
- `docs/` - Project documentation

## Making Changes

1. Create a feature branch from `main`:
```bash
git checkout -b feature/your-feature-name
```

2. Make your changes and test them locally.

3. Commit with clear, descriptive messages:
```bash
git commit -m "Add feature: description of what changed"
```

4. Push your branch and open a pull request:
```bash
git push -u origin feature/your-feature-name
```

## Code Style

- Follow existing code patterns in the project
- Keep functions focused and small
- Add comments for non-obvious logic
- Update README.md if adding new features or changing setup

## Testing

Test your changes with both the standalone version (`index.html`) and the full stack version (`./run.sh`).

## Questions?

Open an issue for discussion before starting work on major changes.
