# Contributing to Project Kanban

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

The script will:
- Create a Python virtual environment
- Install backend dependencies
- Start Flask backend on port 5002
- Start frontend on port 8085

## Project Structure

```
.
├── backend/          # Flask API server
│   ├── app.py       # Main backend application
│   ├── data.json    # Kanban data store
│   └── requirements.txt
├── frontend/        # React frontend
│   ├── app.jsx      # Main React component
│   ├── index.html   # Frontend entry point
│   └── styles.css   # Styling
├── mcp-server/      # MCP server for Cursor integration
│   ├── kanban_mcp.py
│   └── README.md
└── docs/            # Project documentation

```

## Making Changes

1. Create a feature branch:
```bash
git checkout -b feature/your-feature-name
```

2. Make your changes and test them locally

3. Commit with descriptive messages:
```bash
git add .
git commit -m "Add feature: description"
```

4. Push and create a pull request:
```bash
git push -u origin feature/your-feature-name
```

## Code Style

- Python: Follow PEP 8
- JavaScript/React: Use consistent formatting
- Keep functions small and focused
- Add comments for complex logic

## Testing

- Test the frontend at http://localhost:8085
- Test API endpoints at http://localhost:5002
- Verify MCP integration if modifying `mcp-server/`

## Optional Features

The app has several optional integrations:

- **Asana sync**: Set `KANBAN_ASANA_HOME` and `PROJECTS_JSON`
- **Autonomous scheduling**: Controlled by `AUTONOMOUS_ENABLED`
- **AI suggestions**: Requires `ANTHROPIC_API_KEY`

See README.md for full environment variable documentation.

## Questions?

Open an issue for bugs or feature requests.
