/* ============================================
   KANBAN + AI ASSISTANT APPLICATION
   ============================================ */

// ============================================
// DATA MANAGEMENT
// ============================================

let projects = [];
let activeProjectId = null;
let currentStepType = 'step';
let currentDetailProjectId = null;

// Load data from localStorage
function loadData() {
    const saved = localStorage.getItem('kanban-ai-data');
    if (saved) {
        const data = JSON.parse(saved);
        projects = data.projects || [];
    }
    renderAll();
}

// Save data to localStorage
function saveData() {
    localStorage.setItem('kanban-ai-data', JSON.stringify({ projects }));
}

// Generate unique ID
function generateId() {
    return 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ============================================
// PROJECT MANAGEMENT
// ============================================

function showAddProjectModal() {
    document.getElementById('modal-title').textContent = 'New Project';
    document.getElementById('project-form').reset();
    document.getElementById('project-id').value = '';
    document.getElementById('project-modal').classList.add('active');
}

function editProject(id) {
    const project = projects.find(p => p.id === id);
    if (!project) return;

    document.getElementById('modal-title').textContent = 'Edit Project';
    document.getElementById('project-id').value = project.id;
    document.getElementById('project-title').value = project.title;
    document.getElementById('project-description').value = project.description || '';
    document.getElementById('project-priority').value = project.priority || 'medium';
    document.getElementById('project-due').value = project.dueDate || '';
    document.getElementById('project-tags').value = (project.tags || []).join(', ');

    document.getElementById('project-modal').classList.add('active');
}

function saveProject(event) {
    event.preventDefault();

    const id = document.getElementById('project-id').value;
    const title = document.getElementById('project-title').value.trim();
    const description = document.getElementById('project-description').value.trim();
    const priority = document.getElementById('project-priority').value;
    const dueDate = document.getElementById('project-due').value;
    const tagsInput = document.getElementById('project-tags').value;
    const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];

    if (id) {
        // Update existing project
        const project = projects.find(p => p.id === id);
        if (project) {
            project.title = title;
            project.description = description;
            project.priority = priority;
            project.dueDate = dueDate;
            project.tags = tags;
            project.updatedAt = new Date().toISOString();
        }
        showToast('Project updated', 'success');
    } else {
        // Create new project
        const newProject = {
            id: generateId(),
            title,
            description,
            priority,
            dueDate,
            tags,
            status: 'backlog',
            workLog: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        projects.push(newProject);
        showToast('Project created', 'success');
    }

    saveData();
    renderAll();
    closeModal();
}

function deleteProject(id) {
    if (!confirm('Are you sure you want to delete this project?')) return;

    projects = projects.filter(p => p.id !== id);

    if (activeProjectId === id) {
        activeProjectId = null;
    }

    saveData();
    renderAll();
    closeDetailModal();
    showToast('Project deleted', 'success');
}

function closeModal() {
    document.getElementById('project-modal').classList.remove('active');
}

// ============================================
// PROJECT DETAIL MODAL
// ============================================

function showProjectDetail(id) {
    const project = projects.find(p => p.id === id);
    if (!project) return;

    currentDetailProjectId = id;

    document.getElementById('detail-title').textContent = project.title;
    document.getElementById('detail-description').textContent = project.description || 'No description';

    const statusBadge = document.getElementById('detail-status');
    statusBadge.textContent = formatStatus(project.status);
    statusBadge.className = 'status-badge ' + project.status;

    const priorityBadge = document.getElementById('detail-priority');
    priorityBadge.textContent = project.priority || 'Medium';
    priorityBadge.className = 'priority-badge ' + (project.priority || 'medium');

    document.getElementById('detail-due').textContent = project.dueDate ? formatDate(project.dueDate) : 'Not set';
    document.getElementById('detail-created').textContent = formatDateTime(project.createdAt);

    // Tags
    const tagsContainer = document.getElementById('detail-tags');
    tagsContainer.innerHTML = '';
    if (project.tags && project.tags.length) {
        project.tags.forEach(tag => {
            const tagEl = document.createElement('span');
            tagEl.className = 'tag';
            tagEl.textContent = tag;
            tagsContainer.appendChild(tagEl);
        });
    } else {
        tagsContainer.innerHTML = '<span style="color: var(--text-muted)">No tags</span>';
    }

    // Work log
    const worklogContainer = document.getElementById('detail-worklog');
    if (project.workLog && project.workLog.length) {
        worklogContainer.innerHTML = project.workLog.map(entry => `
            <div class="log-entry ${entry.type}">
                <div class="log-entry-header">
                    <span class="log-entry-type">${entry.type}</span>
                    <span class="log-entry-time">${formatDateTime(entry.timestamp)}</span>
                </div>
                <div class="log-entry-content">${escapeHtml(entry.content)}</div>
            </div>
        `).join('');
    } else {
        worklogContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 0.875rem;">No work log entries yet.</p>';
    }

    document.getElementById('detail-modal').classList.add('active');
}

function closeDetailModal() {
    document.getElementById('detail-modal').classList.remove('active');
    currentDetailProjectId = null;
}

function editCurrentProject() {
    if (currentDetailProjectId) {
        closeDetailModal();
        editProject(currentDetailProjectId);
    }
}

function deleteCurrentProject() {
    if (currentDetailProjectId) {
        deleteProject(currentDetailProjectId);
    }
}

// ============================================
// DRAG AND DROP
// ============================================

function allowDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.add('drag-over');
}

function drag(event) {
    event.dataTransfer.setData('text/plain', event.target.dataset.id);
    event.target.classList.add('dragging');
}

function dragEnd(event) {
    event.target.classList.remove('dragging');
    document.querySelectorAll('.column-content').forEach(col => {
        col.classList.remove('drag-over');
    });
}

function drop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');

    const projectId = event.dataTransfer.getData('text/plain');
    const newStatus = event.currentTarget.id;

    const project = projects.find(p => p.id === projectId);
    if (project && project.status !== newStatus) {
        const oldStatus = project.status;
        project.status = newStatus;
        project.updatedAt = new Date().toISOString();

        // Auto-add work log entry for status change
        project.workLog = project.workLog || [];
        project.workLog.push({
            type: 'step',
            content: `Status changed: ${formatStatus(oldStatus)} → ${formatStatus(newStatus)}`,
            timestamp: new Date().toISOString()
        });

        saveData();
        renderAll();
        showToast(`Moved to ${formatStatus(newStatus)}`, 'success');
    }
}

// ============================================
// AI WORK LOG
// ============================================

function selectActiveProject() {
    const select = document.getElementById('active-project');
    activeProjectId = select.value || null;
    renderWorkLog();
}

function setStepType(type) {
    currentStepType = type;
    document.querySelectorAll('.step-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });
}

function addStep() {
    if (!activeProjectId) {
        showToast('Please select a project first', 'error');
        return;
    }

    const input = document.getElementById('ai-input');
    const content = input.value.trim();

    if (!content) {
        showToast('Please enter some content', 'error');
        return;
    }

    const project = projects.find(p => p.id === activeProjectId);
    if (!project) return;

    project.workLog = project.workLog || [];
    project.workLog.push({
        id: generateId(),
        type: currentStepType,
        content,
        timestamp: new Date().toISOString()
    });
    project.updatedAt = new Date().toISOString();

    saveData();
    renderWorkLog();
    renderProjects();
    input.value = '';
    showToast('Entry added', 'success');
}

function deleteLogEntry(entryId) {
    if (!activeProjectId) return;

    const project = projects.find(p => p.id === activeProjectId);
    if (!project || !project.workLog) return;

    project.workLog = project.workLog.filter(e => e.id !== entryId);
    project.updatedAt = new Date().toISOString();

    saveData();
    renderWorkLog();
}

function addTemplate(templateType) {
    if (!activeProjectId) {
        showToast('Please select a project first', 'error');
        return;
    }

    const templates = {
        started: { type: 'step', content: 'Started working on this task.' },
        completed: { type: 'step', content: 'Completed the current task successfully.' },
        blocked: { type: 'blocker', content: 'Blocked: [describe blocker here]' },
        review: { type: 'note', content: 'Ready for review. All requirements met.' }
    };

    const template = templates[templateType];
    if (!template) return;

    const project = projects.find(p => p.id === activeProjectId);
    if (!project) return;

    project.workLog = project.workLog || [];
    project.workLog.push({
        id: generateId(),
        type: template.type,
        content: template.content,
        timestamp: new Date().toISOString()
    });
    project.updatedAt = new Date().toISOString();

    saveData();
    renderWorkLog();
    renderProjects();
    showToast('Template added', 'success');
}

function clearAILog() {
    if (!activeProjectId) return;

    if (!confirm('Clear all work log entries for this project?')) return;

    const project = projects.find(p => p.id === activeProjectId);
    if (project) {
        project.workLog = [];
        project.updatedAt = new Date().toISOString();
        saveData();
        renderWorkLog();
        showToast('Work log cleared', 'success');
    }
}

function copyAILog() {
    if (!activeProjectId) {
        showToast('No project selected', 'error');
        return;
    }

    const project = projects.find(p => p.id === activeProjectId);
    if (!project || !project.workLog || !project.workLog.length) {
        showToast('No entries to copy', 'error');
        return;
    }

    const text = `# Work Log: ${project.title}\n\n` +
        project.workLog.map(entry => {
            const time = formatDateTime(entry.timestamp);
            return `[${entry.type.toUpperCase()}] ${time}\n${entry.content}\n`;
        }).join('\n');

    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied to clipboard', 'success');
    }).catch(() => {
        showToast('Failed to copy', 'error');
    });
}

// ============================================
// RENDERING
// ============================================

function renderAll() {
    renderProjects();
    renderProjectSelector();
    renderWorkLog();
    updateCounts();
}

function renderProjects() {
    const columns = ['backlog', 'in-progress', 'review', 'done'];

    columns.forEach(status => {
        const container = document.getElementById(status);
        const columnProjects = projects.filter(p => p.status === status);

        container.innerHTML = columnProjects.map(project => {
            const dueDateClass = getDueDateClass(project.dueDate);
            const stepCount = (project.workLog || []).length;

            return `
                <div class="project-card"
                     data-id="${project.id}"
                     draggable="true"
                     ondragstart="drag(event)"
                     ondragend="dragEnd(event)">
                    <div class="card-header">
                        <span class="card-title" onclick="showProjectDetail('${project.id}')">${escapeHtml(project.title)}</span>
                        <span class="priority-indicator priority-${project.priority || 'medium'}"></span>
                    </div>
                    ${project.description ? `<p class="card-description">${escapeHtml(project.description)}</p>` : ''}
                    <div class="card-footer">
                        <div class="card-tags">
                            ${(project.tags || []).slice(0, 2).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
                            ${(project.tags || []).length > 2 ? `<span class="tag">+${project.tags.length - 2}</span>` : ''}
                        </div>
                        <div style="display: flex; gap: 0.5rem; align-items: center;">
                            ${stepCount > 0 ? `<span class="step-count">${stepCount} steps</span>` : ''}
                            ${project.dueDate ? `<span class="card-due ${dueDateClass}">${formatDate(project.dueDate)}</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    });
}

function renderProjectSelector() {
    const select = document.getElementById('active-project');
    const currentValue = select.value;

    select.innerHTML = '<option value="">-- Select Project --</option>' +
        projects.map(p => `<option value="${p.id}">${escapeHtml(p.title)} (${formatStatus(p.status)})</option>`).join('');

    // Restore selection if still valid
    if (currentValue && projects.find(p => p.id === currentValue)) {
        select.value = currentValue;
    } else {
        activeProjectId = null;
    }
}

function renderWorkLog() {
    const container = document.getElementById('work-log');

    if (!activeProjectId) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Select a project and start logging your work steps.</p>
                <p class="hint">The AI assistant will help you track your progress.</p>
            </div>
        `;
        return;
    }

    const project = projects.find(p => p.id === activeProjectId);
    if (!project) return;

    if (!project.workLog || project.workLog.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No work log entries yet for "${escapeHtml(project.title)}".</p>
                <p class="hint">Add your first entry above to start tracking.</p>
            </div>
        `;
        return;
    }

    // Show most recent first
    const entries = [...project.workLog].reverse();

    container.innerHTML = entries.map(entry => `
        <div class="log-entry ${entry.type}">
            <button class="log-entry-delete" onclick="deleteLogEntry('${entry.id}')" title="Delete">&times;</button>
            <div class="log-entry-header">
                <span class="log-entry-type">${entry.type}</span>
                <span class="log-entry-time">${formatDateTime(entry.timestamp)}</span>
            </div>
            <div class="log-entry-content">${escapeHtml(entry.content)}</div>
        </div>
    `).join('');
}

function updateCounts() {
    const columns = ['backlog', 'in-progress', 'review', 'done'];
    columns.forEach(status => {
        const count = projects.filter(p => p.status === status).length;
        document.getElementById(`count-${status}`).textContent = count;
    });
}

// ============================================
// IMPORT / EXPORT
// ============================================

function exportData() {
    const data = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        projects
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kanban-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('Data exported', 'success');
}

function importData() {
    document.getElementById('import-file').click();
}

function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.projects && Array.isArray(data.projects)) {
                if (confirm(`Import ${data.projects.length} projects? This will merge with existing projects.`)) {
                    // Merge, avoiding duplicates by ID
                    const existingIds = new Set(projects.map(p => p.id));
                    const newProjects = data.projects.filter(p => !existingIds.has(p.id));
                    projects = [...projects, ...newProjects];
                    saveData();
                    renderAll();
                    showToast(`Imported ${newProjects.length} new projects`, 'success');
                }
            } else {
                showToast('Invalid file format', 'error');
            }
        } catch (err) {
            showToast('Failed to parse file', 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset for re-import
}

// ============================================
// UTILITIES
// ============================================

function formatStatus(status) {
    const map = {
        'backlog': 'Backlog',
        'in-progress': 'In Progress',
        'review': 'Review',
        'done': 'Done'
    };
    return map[status] || status;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

function formatDateTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getDueDateClass(dueDate) {
    if (!dueDate) return '';
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'overdue';
    if (diffDays <= 3) return 'soon';
    return '';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast ' + type + ' show';

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + Enter to add step
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const input = document.getElementById('ai-input');
        if (document.activeElement === input) {
            addStep();
        }
    }

    // Escape to close modals
    if (e.key === 'Escape') {
        closeModal();
        closeDetailModal();
    }

    // Ctrl/Cmd + N for new project
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        showAddProjectModal();
    }
});

// ============================================
// INITIALIZE
// ============================================

document.addEventListener('DOMContentLoaded', loadData);

// Close modals when clicking outside
document.getElementById('project-modal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
});

document.getElementById('detail-modal').addEventListener('click', function(e) {
    if (e.target === this) closeDetailModal();
});
