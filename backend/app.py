"""
Kanban - Flask Backend
Integrated with projects.json project manager (optional).
WSL-friendly: Asana and project-manager paths are optional; use env vars to configure.
"""

from pathlib import Path
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / '.env')
except ImportError:
    pass

from flask import Flask, jsonify, request, Response
from flask_cors import CORS
from datetime import datetime
import json
import os
import uuid
import re
import requests
import threading
import subprocess
import sys
import concurrent.futures

# Optional: Asana integration (requires pm_tools on work machine)
ASANA_AVAILABLE = False
asana_api_create_project = None
asana_api_update_project = None
asana_create_section = None
asana_get_sections = None
asana_api_create_task = None
asana_api_update_task = None
asana_add_task_to_section = None
asana_api_get_tasks = None
asana_add_attachment = None

_asana_home = os.environ.get('KANBAN_ASANA_HOME', os.path.expanduser('~'))
if _asana_home:
    try:
        sys.path.insert(0, _asana_home)
        from pm_tools.asana_tools import (
            asana_create_project as asana_api_create_project,
            asana_update_project as asana_api_update_project,
            asana_create_section,
            asana_get_sections,
            asana_create_task as asana_api_create_task,
            asana_update_task as asana_api_update_task,
            asana_add_task_to_section,
            asana_get_tasks as asana_api_get_tasks,
            asana_add_attachment,
        )
        ASANA_AVAILABLE = True
    except ImportError:
        pass

app = Flask(__name__)
CORS(app)

# Librarian Configuration
LIBRARIAN_URL = os.environ.get('LIBRARIAN_URL', 'http://localhost:8080')

# Data file paths
DATA_FILE = os.path.join(os.path.dirname(__file__), 'data.json')
# Project manager sync (optional; set PROJECTS_JSON to path or leave unset on WSL)
PROJECTS_JSON = os.environ.get('PROJECTS_JSON', '')

# ============================================
# DATA MANAGEMENT
# ============================================

def load_data():
    """Load projects from JSON file"""
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r') as f:
            return json.load(f)
    return {'projects': []}

def save_data(data):
    """Save projects to JSON file"""
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=2)
    # Also sync status changes back to projects.json
    sync_to_project_manager(data)

def load_project_manager():
    """Load the main projects.json file (optional; used when PROJECTS_JSON is set)."""
    if not PROJECTS_JSON or not os.path.exists(PROJECTS_JSON):
        return {'projects': [], '_metadata': {}}
    with open(PROJECTS_JSON, 'r') as f:
        return json.load(f)

def save_project_manager(data):
    """Save to the main projects.json file (no-op if PROJECTS_JSON not set)."""
    if not PROJECTS_JSON:
        return
    with open(PROJECTS_JSON, 'w') as f:
        json.dump(data, f, indent=2)

def sync_to_project_manager(kanban_data):
    """Sync Kanban status changes back to projects.json (no-op if not configured)."""
    if not PROJECTS_JSON:
        return
    try:
        pm_data = load_project_manager()

        # Map Kanban status to project manager status
        status_map = {
            'backlog': 'Planning',
            'in-progress': 'In Development',
            'review': 'UAT Pending',
            'done': 'Production',
            'cancelled': 'Cancelled'
        }

        # Build lookup by title/aliases
        for kanban_project in kanban_data.get('projects', []):
            kanban_title = kanban_project.get('title', '')
            kanban_status = kanban_project.get('status', '')

            # Find matching project in projects.json
            for pm_project in pm_data.get('projects', []):
                pm_name = pm_project.get('name', '')
                pm_aliases = pm_project.get('aliases', [])

                # Check if titles match
                if (kanban_title.lower() in [pm_name.lower()] + [a.lower() for a in pm_aliases] or
                    any(alias.lower() in kanban_title.lower() for alias in pm_aliases)):
                    # Update status if changed
                    new_status = status_map.get(kanban_status, pm_project.get('status'))
                    if pm_project.get('status') != new_status and kanban_status == 'done':
                        pm_project['status'] = 'Production'
                    break

        pm_data['_metadata']['last_updated'] = datetime.now().strftime('%Y-%m-%d')
        save_project_manager(pm_data)
    except Exception as e:
        print(f"Warning: Could not sync to projects.json: {e}")

def generate_id(prefix='p'):
    """Generate unique ID"""
    return f"{prefix}_{datetime.now().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:8]}"

def get_project_tasks(project):
    """Get tasks for a project, defaulting to empty list"""
    if 'tasks' not in project:
        project['tasks'] = []
    return project['tasks']




# ============================================
# ROOT
# ============================================

@app.route('/')
def root():
    """Backend API root. Frontend runs on port 8085."""
    host = request.host.split(':')[0]
    return f'<html><body><h1>Kanban Backend</h1><p>API at <a href="/api/projects">/api/projects</a></p><p>Frontend: <a href="http://{host}:8085">http://{host}:8085</a></p></body></html>'


# ============================================
# PROJECT ENDPOINTS
# ============================================

@app.route('/api/projects', methods=['GET'])
def get_projects():
    """Get all projects"""
    data = load_data()
    return jsonify(data['projects'])

@app.route('/api/projects', methods=['POST'])
def create_project():
    """Create a new project"""
    data = load_data()
    project_data = request.json

    new_project = {
        'id': generate_id(),
        'title': project_data.get('title', 'Untitled'),
        'description': project_data.get('description', ''),
        'status': project_data.get('status', 'backlog'),
        'priority': project_data.get('priority', 'medium'),
        'dueDate': project_data.get('dueDate'),
        'tags': project_data.get('tags', []),
        'dependencies': project_data.get('dependencies', []),  # IDs of projects this depends on
        'blockedBy': project_data.get('blockedBy', []),  # IDs of projects blocking this
        'blocks': project_data.get('blocks', []),  # IDs of projects this blocks
        'tasks': [],
        'workLog': [],
        'createdAt': datetime.now().isoformat(),
        'updatedAt': datetime.now().isoformat()
    }

    data['projects'].append(new_project)
    save_data(data)

    return jsonify(new_project), 201

@app.route('/api/projects/<project_id>', methods=['GET'])
def get_project(project_id):
    """Get a single project"""
    data = load_data()
    project = next((p for p in data['projects'] if p['id'] == project_id), None)

    if not project:
        return jsonify({'error': 'Project not found'}), 404

    return jsonify(project)

@app.route('/api/projects/<project_id>', methods=['PUT'])
def update_project(project_id):
    """Update a project"""
    data = load_data()
    project_index = next((i for i, p in enumerate(data['projects']) if p['id'] == project_id), None)

    if project_index is None:
        return jsonify({'error': 'Project not found'}), 404

    update_data = request.json
    project = data['projects'][project_index]

    # Update fields
    for key in ['title', 'description', 'status', 'priority', 'dueDate', 'tags', 'dependencies', 'blockedBy', 'blocks', 'githubRepo']:
        if key in update_data:
            project[key] = update_data[key]

    project['updatedAt'] = datetime.now().isoformat()

    save_data(data)
    return jsonify(project)

@app.route('/api/projects/<project_id>', methods=['DELETE'])
def delete_project(project_id):
    """Delete a project"""
    data = load_data()

    # Remove project
    data['projects'] = [p for p in data['projects'] if p['id'] != project_id]

    # Remove from dependencies of other projects
    for project in data['projects']:
        project['dependencies'] = [d for d in project.get('dependencies', []) if d != project_id]
        project['blockedBy'] = [b for b in project.get('blockedBy', []) if b != project_id]
        project['blocks'] = [b for b in project.get('blocks', []) if b != project_id]

    save_data(data)
    return jsonify({'success': True})

@app.route('/api/projects/<project_id>/status', methods=['PATCH'])
def update_project_status(project_id):
    """Update project status (for drag-drop)"""
    data = load_data()
    project = next((p for p in data['projects'] if p['id'] == project_id), None)

    if not project:
        return jsonify({'error': 'Project not found'}), 404

    new_status = request.json.get('status')
    cancel_reason = request.json.get('cancelReason', '')
    old_status = project['status']

    if new_status and new_status != old_status:
        project['status'] = new_status
        project['updatedAt'] = datetime.now().isoformat()

        # Build log content
        log_content = f"Status changed: {format_status(old_status)} → {format_status(new_status)}"
        if new_status == 'cancelled' and cancel_reason:
            project['cancelReason'] = cancel_reason
            log_content += f"\nReason: {cancel_reason}"

        # Auto-add work log entry
        project['workLog'].append({
            'id': generate_id(),
            'type': 'step',
            'content': log_content,
            'timestamp': datetime.now().isoformat()
        })

        save_data(data)

    return jsonify(project)

# ============================================
# DEPENDENCY ENDPOINTS
# ============================================

@app.route('/api/projects/<project_id>/dependencies', methods=['POST'])
def add_dependency(project_id):
    """Add a dependency to a project"""
    data = load_data()
    project = next((p for p in data['projects'] if p['id'] == project_id), None)
    dependency_id = request.json.get('dependencyId')

    if not project:
        return jsonify({'error': 'Project not found'}), 404

    dependency = next((p for p in data['projects'] if p['id'] == dependency_id), None)
    if not dependency:
        return jsonify({'error': 'Dependency project not found'}), 404

    # Add to blockedBy list (this project is blocked by dependency)
    if 'blockedBy' not in project:
        project['blockedBy'] = []
    if dependency_id not in project['blockedBy']:
        project['blockedBy'].append(dependency_id)

    # Add to blocks list of the dependency (dependency blocks this project)
    if 'blocks' not in dependency:
        dependency['blocks'] = []
    if project_id not in dependency['blocks']:
        dependency['blocks'].append(project_id)

    project['updatedAt'] = datetime.now().isoformat()
    dependency['updatedAt'] = datetime.now().isoformat()

    save_data(data)
    return jsonify(project)

@app.route('/api/projects/<project_id>/dependencies/<dependency_id>', methods=['DELETE'])
def remove_dependency(project_id, dependency_id):
    """Remove a dependency from a project"""
    data = load_data()
    project = next((p for p in data['projects'] if p['id'] == project_id), None)

    if not project:
        return jsonify({'error': 'Project not found'}), 404

    # Remove from blockedBy
    project['blockedBy'] = [b for b in project.get('blockedBy', []) if b != dependency_id]

    # Remove from blocks of the dependency
    dependency = next((p for p in data['projects'] if p['id'] == dependency_id), None)
    if dependency:
        dependency['blocks'] = [b for b in dependency.get('blocks', []) if b != project_id]
        dependency['updatedAt'] = datetime.now().isoformat()

    project['updatedAt'] = datetime.now().isoformat()

    save_data(data)
    return jsonify(project)

# ============================================
# WORK LOG ENDPOINTS
# ============================================

@app.route('/api/projects/<project_id>/worklog', methods=['GET'])
def get_worklog(project_id):
    """Get work log for a project"""
    data = load_data()
    project = next((p for p in data['projects'] if p['id'] == project_id), None)

    if not project:
        return jsonify({'error': 'Project not found'}), 404

    return jsonify(project.get('workLog', []))

@app.route('/api/projects/<project_id>/worklog', methods=['POST'])
def add_worklog_entry(project_id):
    """Add a work log entry with extended details"""
    data = load_data()
    project = next((p for p in data['projects'] if p['id'] == project_id), None)

    if not project:
        return jsonify({'error': 'Project not found'}), 404

    entry_data = request.json
    entry = {
        'id': generate_id(),
        'type': entry_data.get('type', 'step'),
        'content': entry_data.get('content', ''),
        'timestamp': datetime.now().isoformat(),
        # Extended fields for clickable details
        'details': entry_data.get('details', ''),
        'files': entry_data.get('files', []),  # List of related files
        'links': entry_data.get('links', []),  # List of related links/URLs
        'codeSnippet': entry_data.get('codeSnippet', ''),  # Code reference
        'outcome': entry_data.get('outcome', ''),  # Result/outcome of the step
        'duration': entry_data.get('duration', ''),  # How long it took
        'author': entry_data.get('author', 'Claude'),  # Who made this entry
    }

    if 'workLog' not in project:
        project['workLog'] = []

    project['workLog'].append(entry)
    project['updatedAt'] = datetime.now().isoformat()

    save_data(data)
    return jsonify(entry), 201

@app.route('/api/projects/<project_id>/worklog/<entry_id>', methods=['PUT'])
def update_worklog_entry(project_id, entry_id):
    """Update a work log entry"""
    data = load_data()
    project = next((p for p in data['projects'] if p['id'] == project_id), None)

    if not project:
        return jsonify({'error': 'Project not found'}), 404

    entry = next((e for e in project.get('workLog', []) if e['id'] == entry_id), None)
    if not entry:
        return jsonify({'error': 'Entry not found'}), 404

    update_data = request.json
    for key in ['content', 'details', 'files', 'links', 'codeSnippet', 'outcome', 'duration', 'type']:
        if key in update_data:
            entry[key] = update_data[key]

    entry['updatedAt'] = datetime.now().isoformat()
    project['updatedAt'] = datetime.now().isoformat()

    save_data(data)
    return jsonify(entry)

@app.route('/api/projects/<project_id>/worklog/<entry_id>', methods=['DELETE'])
def delete_worklog_entry(project_id, entry_id):
    """Delete a work log entry"""
    data = load_data()
    project = next((p for p in data['projects'] if p['id'] == project_id), None)

    if not project:
        return jsonify({'error': 'Project not found'}), 404

    project['workLog'] = [e for e in project.get('workLog', []) if e['id'] != entry_id]
    project['updatedAt'] = datetime.now().isoformat()

    save_data(data)
    return jsonify({'success': True})

# ============================================
# TASK ENDPOINTS (subtasks within projects)
# ============================================

@app.route('/api/projects/<project_id>/tasks', methods=['GET'])
def get_tasks(project_id):
    """Get all tasks for a project"""
    data = load_data()
    project = next((p for p in data['projects'] if p['id'] == project_id), None)

    if not project:
        return jsonify({'error': 'Project not found'}), 404

    return jsonify(get_project_tasks(project))

@app.route('/api/projects/<project_id>/tasks', methods=['POST'])
def create_task(project_id):
    """Create a task within a project"""
    data = load_data()
    project = next((p for p in data['projects'] if p['id'] == project_id), None)

    if not project:
        return jsonify({'error': 'Project not found'}), 404

    task_data = request.json
    task = {
        'id': generate_id('t'),
        'title': task_data.get('title', 'Untitled Task'),
        'description': task_data.get('description', ''),
        'status': task_data.get('status', 'todo'),
        'priority': task_data.get('priority', 'medium'),
        'createdAt': datetime.now().isoformat(),
        'updatedAt': datetime.now().isoformat()
    }

    tasks = get_project_tasks(project)
    tasks.append(task)
    project['updatedAt'] = datetime.now().isoformat()

    save_data(data)
    return jsonify(task), 201

@app.route('/api/projects/<project_id>/tasks/<task_id>', methods=['PUT'])
def update_task(project_id, task_id):
    """Update a task"""
    data = load_data()
    project = next((p for p in data['projects'] if p['id'] == project_id), None)

    if not project:
        return jsonify({'error': 'Project not found'}), 404

    tasks = get_project_tasks(project)
    task = next((t for t in tasks if t['id'] == task_id), None)

    if not task:
        return jsonify({'error': 'Task not found'}), 404

    update_data = request.json
    for key in ['title', 'description', 'status', 'priority']:
        if key in update_data:
            task[key] = update_data[key]

    task['updatedAt'] = datetime.now().isoformat()
    project['updatedAt'] = datetime.now().isoformat()

    save_data(data)
    return jsonify(task)

@app.route('/api/projects/<project_id>/tasks/<task_id>', methods=['DELETE'])
def delete_task(project_id, task_id):
    """Delete a task"""
    data = load_data()
    project = next((p for p in data['projects'] if p['id'] == project_id), None)

    if not project:
        return jsonify({'error': 'Project not found'}), 404

    tasks = get_project_tasks(project)
    project['tasks'] = [t for t in tasks if t['id'] != task_id]
    project['updatedAt'] = datetime.now().isoformat()

    save_data(data)
    return jsonify({'success': True})

@app.route('/api/projects/<project_id>/tasks/<task_id>/status', methods=['PATCH'])
def update_task_status(project_id, task_id):
    """Update task status"""
    data = load_data()
    project = next((p for p in data['projects'] if p['id'] == project_id), None)

    if not project:
        return jsonify({'error': 'Project not found'}), 404

    tasks = get_project_tasks(project)
    task = next((t for t in tasks if t['id'] == task_id), None)

    if not task:
        return jsonify({'error': 'Task not found'}), 404

    new_status = request.json.get('status')
    if new_status in ('todo', 'in-progress', 'done'):
        task['status'] = new_status
        task['updatedAt'] = datetime.now().isoformat()
        project['updatedAt'] = datetime.now().isoformat()
        save_data(data)

    return jsonify(task)



# ============================================
# UTILITIES
# ============================================

def format_status(status):
    """Format status for display"""
    status_map = {
        'backlog': 'Backlog',
        'in-progress': 'In Progress',
        'review': 'Review',
        'done': 'Done',
        'cancelled': 'Cancelled'
    }
    return status_map.get(status, status)

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()})

@app.route('/api/sync-from-pm', methods=['POST'])
def sync_from_project_manager():
    """Import/sync projects from projects.json"""
    try:
        pm_data = load_project_manager()
        kanban_data = load_data()

        # Map project manager status to Kanban status
        status_map = {
            'Planning': 'backlog',
            'In Development': 'in-progress',
            'UAT Pending': 'review',
            'Production': 'done',
            'Functional': 'done',
            'Completed': 'done',
            'Awaiting Infra': 'backlog',
            'On Hold': 'backlog'
        }

        # Priority based on status
        priority_map = {
            'Production': 'high',
            'In Development': 'medium',
            'UAT Pending': 'high',
            'Planning': 'low',
            'Awaiting Infra': 'medium'
        }

        existing_titles = {p['title'].lower(): p for p in kanban_data['projects']}
        new_projects = []
        updated_projects = []

        for pm_project in pm_data.get('projects', []):
            # Get the display name (first alias or name)
            title = pm_project.get('aliases', [pm_project['name']])[0] if pm_project.get('aliases') else pm_project['name']
            pm_status = pm_project.get('status', 'Planning')

            # Check if already exists
            if title.lower() in existing_titles:
                # Update existing project
                existing = existing_titles[title.lower()]
                existing['description'] = pm_project.get('description', existing.get('description', ''))
                if pm_project.get('context'):
                    existing['description'] += f"\n\nContext: {pm_project['context']}"
                updated_projects.append(title)
            else:
                # Create new project
                new_project = {
                    'id': generate_id(),
                    'title': title,
                    'description': pm_project.get('description', ''),
                    'status': status_map.get(pm_status, 'backlog'),
                    'priority': priority_map.get(pm_status, 'medium'),
                    'tags': [pm_status.lower().replace(' ', '-')],
                    'blockedBy': [],
                    'blocks': [],
                    'workLog': [
                        {
                            'id': generate_id(),
                            'type': 'step',
                            'content': f'Synced from projects.json',
                            'timestamp': datetime.now().isoformat(),
                            'details': f'Original status: {pm_status}'
                        }
                    ],
                    'pmName': pm_project['name'],  # Reference to projects.json
                    'pmPath': pm_project.get('path', ''),
                    'createdAt': datetime.now().isoformat(),
                    'updatedAt': datetime.now().isoformat()
                }

                if pm_project.get('context'):
                    new_project['description'] += f"\n\nContext: {pm_project['context']}"
                    new_project['workLog'].append({
                        'id': generate_id(),
                        'type': 'note',
                        'content': pm_project['context'],
                        'timestamp': datetime.now().isoformat(),
                        'details': 'Imported context from projects.json'
                    })

                if pm_project.get('phase'):
                    new_project['tags'].append(pm_project['phase'].lower().replace(' ', '-'))

                kanban_data['projects'].append(new_project)
                new_projects.append(title)

        save_data(kanban_data)

        return jsonify({
            'success': True,
            'new_projects': new_projects,
            'updated_projects': updated_projects,
            'total': len(kanban_data['projects'])
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/project-manager', methods=['GET'])
def get_project_manager():
    """Get the current projects.json data"""
    try:
        pm_data = load_project_manager()
        return jsonify(pm_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500





# ============================================
# LIBRARIAN (DOCS) PROXY
# ============================================

@app.route('/api/docs/search', methods=['GET'])
def docs_search():
    """Search documents via Librarian"""
    query = request.args.get('q', '')
    try:
        resp = requests.get(f'{LIBRARIAN_URL}/docs/search', params={'q': query}, timeout=5)
        return jsonify(resp.json())
    except Exception:
        return jsonify({'results': [], 'success': False})

@app.route('/api/docs/find', methods=['GET'])
def docs_find():
    """Find documents by name via Librarian"""
    query = request.args.get('q', '')
    try:
        resp = requests.get(f'{LIBRARIAN_URL}/docs/find', params={'q': query}, timeout=5)
        return jsonify(resp.json())
    except Exception:
        return jsonify({'results': [], 'success': False})

@app.route('/api/docs/project/<project_name>', methods=['GET'])
def docs_project(project_name):
    """Get project documentation from Librarian"""
    try:
        resp = requests.get(f'{LIBRARIAN_URL}/docs/project/{project_name}', timeout=5)
        if resp.status_code == 200:
            content_type = resp.headers.get('Content-Type', '')
            if 'json' in content_type:
                return jsonify(resp.json())
            return jsonify({'content': resp.text, 'success': True})
        return jsonify({'content': None, 'success': False}), 404
    except Exception:
        return jsonify({'content': None, 'success': False}), 500

@app.route('/api/docs/<category>/<doc_name>', methods=['GET'])
def docs_get(category, doc_name):
    """Get a specific document from Librarian"""
    try:
        resp = requests.get(f'{LIBRARIAN_URL}/docs/{category}/{doc_name}', timeout=5)
        if resp.status_code == 200:
            content_type = resp.headers.get('Content-Type', '')
            if 'json' in content_type:
                return jsonify(resp.json())
            return jsonify({'content': resp.text, 'success': True})
        return jsonify({'content': None, 'success': False}), 404
    except Exception:
        return jsonify({'content': None, 'success': False}), 500

@app.route('/api/docs', methods=['GET'])
def docs_categories():
    """List document categories from Librarian"""
    try:
        resp = requests.get(f'{LIBRARIAN_URL}/docs', timeout=5)
        return jsonify(resp.json())
    except Exception:
        return jsonify({'categories': []})

@app.route('/api/docs/<category>', methods=['GET'])
def docs_list(category):
    """List documents in a category from Librarian"""
    try:
        resp = requests.get(f'{LIBRARIAN_URL}/docs/{category}', timeout=5)
        return jsonify(resp.json())
    except Exception:
        return jsonify({'documents': []})





@app.route('/api/projects/<project_id>/code-dir', methods=['PUT'])
def set_project_code_dir(project_id):
    """Set the code directory for a project (where Cursor will work)."""
    data = load_data()
    project = next((p for p in data['projects'] if p['id'] == project_id), None)

    if not project:
        return jsonify({'error': 'Project not found'}), 404

    code_dir = request.json.get('codeDir', '')
    project['codeDir'] = code_dir
    project['updatedAt'] = datetime.now().isoformat()
    save_data(data)

    return jsonify({'success': True, 'codeDir': code_dir})


# ============================================
# ASANA SYNC
# ============================================

# Status mapping: kanban project status → Asana section name
KANBAN_TO_ASANA_SECTION = {
    'backlog': 'Backlog',
    'in-progress': 'In Progress',
    'review': 'Review',
    'done': 'Done',
    'cancelled': 'Cancelled',
}

# Task status mapping: kanban task status → Asana section + completed
TASK_STATUS_MAP = {
    'todo': {'section': 'Backlog', 'completed': False},
    'in-progress': {'section': 'In Progress', 'completed': False},
    'needs-work': {'section': 'In Progress', 'completed': False},
    'review': {'section': 'Review', 'completed': False},
    'done': {'section': None, 'completed': True},
    'backlog': {'section': 'Backlog', 'completed': False},
}


def build_asana_notes(project):
    """Build rich notes for an Asana project from kanban data."""
    parts = []
    if project.get('description'):
        parts.append(project['description'])

    parts.append(f"\nPriority: {project.get('priority', 'medium')}")
    parts.append(f"Status: {format_status(project.get('status', 'backlog'))}")

    tags = project.get('tags', [])
    if tags:
        parts.append(f"Tags: {', '.join(tags)}")

    # Recent work log (last 5 entries)
    worklog = project.get('workLog', [])
    if worklog:
        parts.append('\n--- Recent Work Log ---')
        for entry in worklog[-5:]:
            ts = entry.get('timestamp', '')[:16].replace('T', ' ')
            parts.append(f"[{ts}] {entry.get('content', '')}")

    return '\n'.join(parts)


def build_task_notes(task):
    """Build notes for an Asana task from kanban task data."""
    parts = []
    if task.get('description'):
        parts.append(task['description'])

    parts.append(f"\nPriority: {task.get('priority', 'medium')}")

    return '\n'.join(parts)


def get_or_create_sections(project):
    """Get cached section GIDs or create sections for an Asana project."""
    asana_pid = project.get('asanaProjectId')
    cached = project.get('asanaSections', {})

    if cached and all(cached.get(s) for s in KANBAN_TO_ASANA_SECTION):
        return cached

    # Fetch existing sections
    result = asana_get_sections(asana_pid)
    if not result.get('success'):
        return None

    existing = {s['name']: s['gid'] for s in result.get('sections', [])}
    sections = {}

    for kanban_status, section_name in KANBAN_TO_ASANA_SECTION.items():
        if section_name in existing:
            sections[kanban_status] = existing[section_name]
        else:
            create_result = asana_create_section(asana_pid, section_name)
            if create_result.get('success'):
                sections[kanban_status] = create_result['section']['gid']
            else:
                return None

    # Remove default "Untitled" section if it exists
    # (Asana creates one automatically)

    return sections


def _sync_project_to_asana(project, data):
    """Core sync logic. Returns a result dict. Saves data on success."""
    # Step 1: Create or update Asana project
    if not project.get('asanaProjectId'):
        result = asana_api_create_project(
            name=project['title'],
            notes=build_asana_notes(project),
            default_view='board'
        )
        if not result.get('success'):
            return {'error': f"Failed to create Asana project: {result.get('error')}"}

        project['asanaProjectId'] = result['project']['gid']

        # Create sections
        sections = {}
        for kanban_status, section_name in KANBAN_TO_ASANA_SECTION.items():
            sec_result = asana_create_section(project['asanaProjectId'], section_name)
            if sec_result.get('success'):
                sections[kanban_status] = sec_result['section']['gid']
            else:
                return {'error': f"Failed to create section '{section_name}': {sec_result.get('error')}"}

        project['asanaSections'] = sections
    else:
        # Update existing project
        asana_api_update_project(
            project['asanaProjectId'],
            name=project['title'],
            notes=build_asana_notes(project)
        )
        # Ensure sections exist
        sections = get_or_create_sections(project)
        if sections:
            project['asanaSections'] = sections
        else:
            sections = project.get('asanaSections', {})

    # Step 2: Sync tasks
    tasks = project.get('tasks', [])
    for task in tasks:
        task_notes = build_task_notes(task)
        is_completed = task.get('status') == 'done'

        if not task.get('asanaTaskId'):
            # Create new task in Asana
            create_result = asana_api_create_task(
                project_id=project['asanaProjectId'],
                name=task['title'],
                notes=task_notes,
            )
            if create_result.get('success'):
                task['asanaTaskId'] = create_result['task']['gid']
                task['asanaSyncedAt'] = datetime.now().isoformat()

                # Set completed status
                if is_completed:
                    asana_api_update_task(task['asanaTaskId'], completed=True)

                # Move to correct section
                task_mapping = TASK_STATUS_MAP.get(task.get('status', 'todo'), {})
                section_name = task_mapping.get('section')
                if section_name:
                    for k_status, s_name in KANBAN_TO_ASANA_SECTION.items():
                        if s_name == section_name and k_status in sections:
                            asana_add_task_to_section(sections[k_status], task['asanaTaskId'])
                            break
        else:
            # Update existing task
            asana_api_update_task(
                task['asanaTaskId'],
                name=task['title'],
                notes=task_notes,
                completed=is_completed
            )

            # Move to correct section
            task_mapping = TASK_STATUS_MAP.get(task.get('status', 'todo'), {})
            section_name = task_mapping.get('section')
            if section_name:
                for k_status, s_name in KANBAN_TO_ASANA_SECTION.items():
                    if s_name == section_name and k_status in sections:
                        asana_add_task_to_section(sections[k_status], task['asanaTaskId'])
                        break

            task['asanaSyncedAt'] = datetime.now().isoformat()

    project['asanaSyncedAt'] = datetime.now().isoformat()
    save_data(data)

    return {
        'success': True,
        'asanaProjectId': project['asanaProjectId'],
        'asanaUrl': f"https://app.asana.com/0/{project['asanaProjectId']}",
        'tasksSync': len(tasks),
        'syncedAt': project['asanaSyncedAt']
    }


@app.route('/api/asana/sync-project/<project_id>', methods=['POST'])
def asana_sync_project(project_id):
    """Push a project and its tasks to Asana."""
    if not ASANA_AVAILABLE:
        return jsonify({'error': 'Asana not configured. Set KANBAN_ASANA_HOME to your pm_tools path.'}), 503
    data = load_data()
    project = next((p for p in data['projects'] if p['id'] == project_id), None)

    if not project:
        return jsonify({'error': 'Project not found'}), 404

    try:
        result = _sync_project_to_asana(project, data)
        if 'error' in result:
            return jsonify(result), 500
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/asana/pull-project/<project_id>', methods=['POST'])
def asana_pull_project(project_id):
    """Pull changes from Asana back into kanban."""
    if not ASANA_AVAILABLE:
        return jsonify({'error': 'Asana not configured.'}), 503
    data = load_data()
    project = next((p for p in data['projects'] if p['id'] == project_id), None)

    if not project:
        return jsonify({'error': 'Project not found'}), 404

    asana_pid = project.get('asanaProjectId')
    if not asana_pid:
        return jsonify({'error': 'Project not linked to Asana'}), 400

    try:
        # Fetch all Asana tasks (including completed)
        tasks_result = asana_api_get_tasks(asana_pid, completed=True)
        if not tasks_result.get('success'):
            return jsonify({'error': f"Failed to fetch Asana tasks: {tasks_result.get('error')}"}), 500

        asana_tasks = tasks_result.get('tasks', [])

        # Fetch sections to map GIDs to kanban statuses
        sections_result = asana_get_sections(asana_pid)
        section_to_status = {}
        if sections_result.get('success'):
            # Reverse map: Asana section name → kanban status
            asana_to_kanban = {v: k for k, v in KANBAN_TO_ASANA_SECTION.items()}
            for section in sections_result.get('sections', []):
                kanban_status = asana_to_kanban.get(section['name'])
                if kanban_status:
                    section_to_status[section['gid']] = kanban_status

        kanban_tasks = project.get('tasks', [])
        asana_task_ids = {t['gid'] for t in asana_tasks}

        # Build lookup of kanban tasks by asanaTaskId
        kanban_by_asana = {t['asanaTaskId']: t for t in kanban_tasks if t.get('asanaTaskId')}

        created = 0
        updated = 0

        for asana_task in asana_tasks:
            asana_gid = asana_task['gid']

            # Determine status from completion + section membership
            if asana_task.get('completed'):
                new_status = 'done'
            else:
                # We need to check which section this task is in
                # The tasks API doesn't return memberships by default,
                # so we use the simple mapping: incomplete = todo/in-progress
                new_status = 'todo'

            if asana_gid in kanban_by_asana:
                # Update existing kanban task
                kt = kanban_by_asana[asana_gid]
                kt['title'] = asana_task.get('name', kt['title'])
                if asana_task.get('completed'):
                    kt['status'] = 'done'
                kt['asanaSyncedAt'] = datetime.now().isoformat()
                updated += 1
            else:
                # Create new kanban task from Asana
                new_task = {
                    'id': generate_id('t'),
                    'title': asana_task.get('name', 'Untitled'),
                    'description': asana_task.get('notes', ''),
                    'status': new_status,
                    'priority': 'medium',
                    'assignedTo': None,
                    'claudeStatus': None,
                    'claudeInstructions': '',
                    'claudeQuestions': [],
                    'claudeUpdates': [],
                    'asanaTaskId': asana_gid,
                    'asanaSyncedAt': datetime.now().isoformat(),
                    'createdAt': datetime.now().isoformat(),
                    'updatedAt': datetime.now().isoformat()
                }
                kanban_tasks.append(new_task)
                created += 1

        # Mark kanban tasks whose asanaTaskId is no longer in Asana as done
        removed = 0
        for kt in kanban_tasks:
            if kt.get('asanaTaskId') and kt['asanaTaskId'] not in asana_task_ids and kt['status'] != 'done':
                kt['status'] = 'done'
                removed += 1

        project['tasks'] = kanban_tasks
        project['asanaSyncedAt'] = datetime.now().isoformat()
        project['updatedAt'] = datetime.now().isoformat()
        save_data(data)

        return jsonify({
            'success': True,
            'created': created,
            'updated': updated,
            'removed': removed,
            'syncedAt': project['asanaSyncedAt']
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/asana/sync-all', methods=['POST'])
def asana_sync_all():
    """Push all projects to Asana."""
    if not ASANA_AVAILABLE:
        return jsonify({'error': 'Asana not configured.'}), 503
    data = load_data()
    results = []

    for project in data['projects']:
        # Only sync active projects (not done/cancelled unless already linked)
        if project.get('status') in ('done', 'cancelled') and not project.get('asanaProjectId'):
            continue

        try:
            result = _sync_project_to_asana(project, data)
            results.append({
                'projectId': project['id'],
                'title': project['title'],
                'result': result
            })
        except Exception as e:
            results.append({
                'projectId': project['id'],
                'title': project['title'],
                'error': str(e)
            })

    return jsonify({
        'success': True,
        'synced': len([r for r in results if r.get('result', {}).get('success')]),
        'total': len(results),
        'results': results
    })


@app.route('/api/asana/status/<project_id>', methods=['GET'])
def asana_status(project_id):
    """Get Asana link status for a project."""
    if not ASANA_AVAILABLE:
        return jsonify({'linked': False, 'asanaProjectId': None, 'asanaUrl': None}), 200
    data = load_data()
    project = next((p for p in data['projects'] if p['id'] == project_id), None)

    if not project:
        return jsonify({'error': 'Project not found'}), 404

    asana_pid = project.get('asanaProjectId')

    return jsonify({
        'linked': bool(asana_pid),
        'asanaProjectId': asana_pid,
        'asanaUrl': f"https://app.asana.com/0/{asana_pid}" if asana_pid else None,
        'syncedAt': project.get('asanaSyncedAt'),
        'sections': project.get('asanaSections', {})
    })


@app.route('/api/asana/attach-doc/<project_id>', methods=['POST'])
def asana_attach_doc(project_id):
    """Attach a Librarian document to the Asana project."""
    if not ASANA_AVAILABLE:
        return jsonify({'error': 'Asana not configured.'}), 503
    data = load_data()
    project = next((p for p in data['projects'] if p['id'] == project_id), None)

    if not project:
        return jsonify({'error': 'Project not found'}), 404

    asana_pid = project.get('asanaProjectId')
    if not asana_pid:
        return jsonify({'error': 'Project not linked to Asana'}), 400

    req_data = request.json or {}
    category = req_data.get('category', '')
    doc_name = req_data.get('name', '')

    if not category or not doc_name:
        return jsonify({'error': 'category and name required'}), 400

    try:
        # Fetch doc content from Librarian for the summary
        doc_content = ''
        try:
            resp = requests.get(f'{LIBRARIAN_URL}/docs/{category}/{doc_name}', timeout=5)
            if resp.status_code == 200:
                content_type = resp.headers.get('Content-Type', '')
                if 'json' in content_type:
                    doc_data = resp.json()
                    doc_content = doc_data.get('content', str(doc_data))
                else:
                    doc_content = resp.text
        except Exception:
            doc_content = ''

        librarian_url = f'http://gvdi-30.netbird.selfhosted:8080/docs/{category}/{doc_name}'

        # Find any task in the project to attach to (use first with asanaTaskId, or create a note task)
        tasks = project.get('tasks', [])
        target_task_id = None
        for task in tasks:
            if task.get('asanaTaskId'):
                target_task_id = task['asanaTaskId']
                break

        # If no task to attach to, create a docs task
        if not target_task_id:
            create_result = asana_api_create_task(
                project_id=asana_pid,
                name=f'Documentation: {doc_name}',
                notes=f'Documentation reference for {doc_name}',
            )
            if create_result.get('success'):
                target_task_id = create_result['task']['gid']

        if target_task_id:
            # Attach as external link
            attach_result = asana_add_attachment(
                target_task_id,
                name=f'{category}/{doc_name}',
                url=librarian_url
            )

            if not attach_result.get('success'):
                return jsonify({'error': f"Failed to attach: {attach_result.get('error')}"}), 500

        # Append summary to project notes
        summary = doc_content[:500] if doc_content else f'Document: {category}/{doc_name}'
        current_notes = ''
        # Re-fetch to not overwrite
        notes_parts = [build_asana_notes(project)]
        notes_parts.append(f'\n\n--- Documentation: {doc_name} ---')
        notes_parts.append(summary)

        asana_api_update_project(asana_pid, notes='\n'.join(notes_parts))

        return jsonify({
            'success': True,
            'attached': bool(target_task_id),
            'docUrl': librarian_url
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/asana/unlink/<project_id>', methods=['POST'])
def asana_unlink(project_id):
    """Remove Asana link from a project (doesn't delete from Asana)."""
    if not ASANA_AVAILABLE:
        return jsonify({'error': 'Asana not configured.'}), 503
    data = load_data()
    project = next((p for p in data['projects'] if p['id'] == project_id), None)

    if not project:
        return jsonify({'error': 'Project not found'}), 404

    project.pop('asanaProjectId', None)
    project.pop('asanaSyncedAt', None)
    project.pop('asanaSections', None)

    # Clear task Asana IDs
    for task in project.get('tasks', []):
        task.pop('asanaTaskId', None)
        task.pop('asanaSyncedAt', None)

    project['updatedAt'] = datetime.now().isoformat()
    save_data(data)

    return jsonify({'success': True})


# ============================================
# ONBOARDING WIZARD
# ============================================

DOCS_DIR = os.path.join(os.path.dirname(__file__), '..', 'docs', 'Projects')


@app.route('/api/wizard/next-code', methods=['GET'])
def wizard_next_code():
    """Generate the next D-YYMM-NNN project code for the current month."""
    now = datetime.now()
    prefix = f"D-{now.strftime('%y%m')}-"

    pm_data = load_project_manager()
    max_num = 0
    for proj in pm_data.get('projects', []):
        name = proj.get('name', '')
        if name.startswith(prefix):
            try:
                num = int(name[len(prefix):].split('-')[0])
                max_num = max(max_num, num)
            except (ValueError, IndexError):
                pass

    next_num = max_num + 1
    code = f"{prefix}{next_num:03d}"
    return jsonify({'code': code})


@app.route('/api/wizard/search', methods=['POST'])
def wizard_web_search():
    """Search the web using DuckDuckGo with a 15-second timeout."""
    try:
        from duckduckgo_search import DDGS
    except ImportError:
        return jsonify({'error': 'duckduckgo-search not installed'}), 500

    data = request.json or {}
    query = data.get('query', '')
    max_results = min(data.get('max_results', 8), 20)

    if not query.strip():
        return jsonify({'results': [], 'query': query})

    def _do_search():
        with DDGS() as ddgs:
            return list(ddgs.text(query, max_results=max_results))

    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(_do_search)
            results = future.result(timeout=15)
        return jsonify({
            'results': [{'title': r.get('title', ''), 'body': r.get('body', ''), 'href': r.get('href', '')} for r in results],
            'query': query
        })
    except concurrent.futures.TimeoutError:
        return jsonify({'results': [], 'query': query, 'error': 'Search timed out'})
    except Exception as e:
        return jsonify({'results': [], 'query': query, 'error': str(e)})




@app.route('/api/wizard/finalize', methods=['POST'])
def wizard_finalize():
    """Create project from wizard data: project in data.json, charter file, projects.json entry."""
    wizard = request.json or {}
    project_code = wizard.get('projectCode', '')
    title = wizard.get('title', 'Untitled')
    description = wizard.get('description', '')
    charter = wizard.get('charter', '')
    tasks_data = wizard.get('tasks', [])
    priority = wizard.get('priority', 'medium')
    tags = wizard.get('tags', [])
    slug = wizard.get('slug', '')

    if not slug:
        slug = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')

    # 1. Create project in data.json (kanban board)
    kanban_data = load_data()
    new_project = {
        'id': generate_id(),
        'title': title,
        'description': description,
        'status': 'backlog',
        'priority': priority,
        'tags': tags,
        'dependencies': [],
        'blockedBy': [],
        'blocks': [],
        'tasks': [],
        'workLog': [{
            'id': generate_id(),
            'type': 'decision',
            'content': f'Project created via Onboarding Wizard ({project_code})',
            'timestamp': datetime.now().isoformat(),
            'author': 'Wizard'
        }],
        'createdAt': datetime.now().isoformat(),
        'updatedAt': datetime.now().isoformat()
    }

    # Add tasks
    for t in tasks_data:
        task = {
            'id': generate_id('t'),
            'title': t.get('title', 'Untitled Task'),
            'description': t.get('description', ''),
            'status': 'todo',
            'priority': t.get('priority', 'medium'),
            'assignedTo': None,
            'claudeStatus': None,
            'claudeInstructions': t.get('claudeInstructions', ''),
            'claudeQuestions': [],
            'claudeUpdates': [],
            'createdAt': datetime.now().isoformat(),
            'updatedAt': datetime.now().isoformat()
        }
        new_project['tasks'].append(task)

    kanban_data['projects'].append(new_project)
    save_data(kanban_data)

    # 2. Save charter markdown
    if charter:
        os.makedirs(DOCS_DIR, exist_ok=True)
        charter_filename = f"{project_code}-{slug}.md"
        charter_path = os.path.join(DOCS_DIR, charter_filename)
        try:
            with open(charter_path, 'w') as f:
                f.write(charter)
        except Exception as e:
            print(f"Warning: Could not save charter: {e}")

    # 3. Add to projects.json registry
    try:
        pm_data = load_project_manager()
        pm_entry = {
            'name': f"{project_code}-{slug}",
            'aliases': [title],
            'description': description,
            'status': 'Planning',
            'created': datetime.now().strftime('%Y-%m'),
            'path': f"docs/Projects/{project_code}-{slug}.md" if charter else ''
        }
        pm_data['projects'].append(pm_entry)
        pm_data['_metadata']['last_updated'] = datetime.now().strftime('%Y-%m-%d')
        save_project_manager(pm_data)
    except Exception as e:
        print(f"Warning: Could not update projects.json: {e}")

    # Delete draft if one was used
    draft_id = wizard.get('draftId')
    if draft_id:
        try:
            drafts = kanban_data.get('wizardDrafts', [])
            kanban_data['wizardDrafts'] = [d for d in drafts if d['id'] != draft_id]
            save_data(kanban_data)
        except Exception as e:
            print(f"Warning: Could not delete draft {draft_id}: {e}")

    return jsonify(new_project), 201


# ============================================
# WIZARD DRAFT ENDPOINTS
# ============================================

@app.route('/api/wizard/drafts', methods=['GET'])
def list_wizard_drafts():
    """List all wizard draft summaries."""
    data = load_data()
    drafts = data.get('wizardDrafts', [])
    summaries = [{
        'id': d['id'],
        'title': d.get('title', 'Untitled'),
        'step': d.get('step', 1),
        'updatedAt': d.get('updatedAt', d.get('createdAt', ''))
    } for d in drafts]
    return jsonify(summaries)


@app.route('/api/wizard/drafts/<draft_id>', methods=['GET'])
def get_wizard_draft(draft_id):
    """Get full draft state."""
    data = load_data()
    draft = next((d for d in data.get('wizardDrafts', []) if d['id'] == draft_id), None)
    if not draft:
        return jsonify({'error': 'Draft not found'}), 404
    return jsonify(draft)


@app.route('/api/wizard/drafts', methods=['POST'])
def create_wizard_draft():
    """Create a new wizard draft."""
    data = load_data()
    draft_data = request.json or {}
    now = datetime.now().isoformat()
    draft = {
        'id': generate_id('draft'),
        'createdAt': now,
        'updatedAt': now,
        **draft_data
    }
    if 'wizardDrafts' not in data:
        data['wizardDrafts'] = []
    data['wizardDrafts'].append(draft)
    save_data(data)
    return jsonify(draft), 201


@app.route('/api/wizard/drafts/<draft_id>', methods=['PUT'])
def update_wizard_draft(draft_id):
    """Update an existing wizard draft."""
    data = load_data()
    drafts = data.get('wizardDrafts', [])
    draft = next((d for d in drafts if d['id'] == draft_id), None)
    if not draft:
        return jsonify({'error': 'Draft not found'}), 404

    update_data = request.json or {}
    for key, value in update_data.items():
        if key != 'id' and key != 'createdAt':
            draft[key] = value
    draft['updatedAt'] = datetime.now().isoformat()
    save_data(data)
    return jsonify(draft)


@app.route('/api/wizard/drafts/<draft_id>', methods=['DELETE'])
def delete_wizard_draft(draft_id):
    """Delete a wizard draft."""
    data = load_data()
    drafts = data.get('wizardDrafts', [])
    data['wizardDrafts'] = [d for d in drafts if d['id'] != draft_id]
    save_data(data)
    return jsonify({'success': True})


# ============================================
# WIZARD DOCUMENT UPLOAD
# ============================================

@app.route('/api/wizard/upload-doc', methods=['POST'])
def wizard_upload_doc():
    """Upload and extract text from PDF, DOCX, or XLSX files."""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    filename = file.filename or 'unknown'
    ext = os.path.splitext(filename)[1].lower()

    MAX_CONTENT = 10000

    try:
        if ext == '.pdf':
            import pdfplumber
            content_parts = []
            with pdfplumber.open(file.stream) as pdf:
                page_count = len(pdf.pages)
                for page in pdf.pages:
                    text = page.extract_text() or ''
                    content_parts.append(text)
            content = '\n\n'.join(content_parts)[:MAX_CONTENT]
            return jsonify({
                'filename': filename,
                'type': 'pdf',
                'pages': page_count,
                'content': content
            })

        elif ext == '.docx':
            import docx
            doc = docx.Document(file.stream)
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            content = '\n\n'.join(paragraphs)[:MAX_CONTENT]
            return jsonify({
                'filename': filename,
                'type': 'docx',
                'paragraphs': len(paragraphs),
                'content': content
            })

        elif ext == '.xlsx':
            import openpyxl
            wb = openpyxl.load_workbook(file.stream, read_only=True, data_only=True)
            sheets_content = []
            for sheet_name in wb.sheetnames:
                ws = wb[sheet_name]
                rows = []
                for row in ws.iter_rows(values_only=True):
                    row_text = '\t'.join(str(c) if c is not None else '' for c in row)
                    rows.append(row_text)
                sheets_content.append(f"=== Sheet: {sheet_name} ===\n" + '\n'.join(rows))
            wb.close()
            content = '\n\n'.join(sheets_content)[:MAX_CONTENT]
            return jsonify({
                'filename': filename,
                'type': 'xlsx',
                'sheets': len(wb.sheetnames) if hasattr(wb, 'sheetnames') else len(sheets_content),
                'content': content
            })

        else:
            return jsonify({'error': f'Unsupported file type: {ext}. Use .pdf, .docx, or .xlsx'}), 400

    except Exception as e:
        return jsonify({'error': f'Failed to process file: {str(e)}'}), 500




# ============================================
# MAIN
# ============================================

if __name__ == '__main__':
    # Initialize data file if it doesn't exist
    if not os.path.exists(DATA_FILE):
        save_data({'projects': []})

    app.run(host='0.0.0.0', port=5002, debug=True)
