const { useState, useEffect, useCallback, useRef } = React;

const API_BASE = `${window.location.protocol}//${window.location.hostname}:5002/api`;

// ============================================
// API FUNCTIONS
// ============================================

const api = {
    async getProjects() {
        const res = await fetch(`${API_BASE}/projects`);
        return res.json();
    },
    async syncFromPM() {
        const res = await fetch(`${API_BASE}/sync-from-pm`, { method: 'POST' });
        return res.json();
    },
    async updateWorklogEntry(projectId, entryId, data) {
        const res = await fetch(`${API_BASE}/projects/${projectId}/worklog/${entryId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },
    async assignToClaude(projectId, instructions) {
        const res = await fetch(`${API_BASE}/projects/${projectId}/assign-claude`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ instructions })
        });
        return res.json();
    },
    async unassignFromClaude(projectId) {
        const res = await fetch(`${API_BASE}/projects/${projectId}/unassign-claude`, {
            method: 'POST'
        });
        return res.json();
    },
    async answerClaudeQuestion(projectId, questionId, answer) {
        const res = await fetch(`${API_BASE}/projects/${projectId}/answer-question/${questionId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answer })
        });
        return res.json();
    },
    async claudeReviewProject(projectId, model) {
        const res = await fetch(`${API_BASE}/projects/${projectId}/claude-review`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: model || 'llama3.2' })
        });
        return res.json();
    },
    async createProject(project) {
        const res = await fetch(`${API_BASE}/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(project)
        });
        return res.json();
    },
    async updateProject(id, data) {
        const res = await fetch(`${API_BASE}/projects/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },
    async deleteProject(id) {
        await fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE' });
    },
    async updateStatus(id, status, cancelReason) {
        const body = { status };
        if (cancelReason) body.cancelReason = cancelReason;
        const res = await fetch(`${API_BASE}/projects/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        return res.json();
    },
    async addDependency(projectId, dependencyId) {
        const res = await fetch(`${API_BASE}/projects/${projectId}/dependencies`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dependencyId })
        });
        return res.json();
    },
    async removeDependency(projectId, dependencyId) {
        const res = await fetch(`${API_BASE}/projects/${projectId}/dependencies/${dependencyId}`, {
            method: 'DELETE'
        });
        return res.json();
    },
    async addWorklogEntry(projectId, entry) {
        const res = await fetch(`${API_BASE}/projects/${projectId}/worklog`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entry)
        });
        return res.json();
    },
    async deleteWorklogEntry(projectId, entryId) {
        await fetch(`${API_BASE}/projects/${projectId}/worklog/${entryId}`, { method: 'DELETE' });
    },
    // Task API functions
    async getTasks(projectId) {
        const res = await fetch(`${API_BASE}/projects/${projectId}/tasks`);
        return res.json();
    },
    async createTask(projectId, task) {
        const res = await fetch(`${API_BASE}/projects/${projectId}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(task)
        });
        return res.json();
    },
    async updateTask(projectId, taskId, data) {
        const res = await fetch(`${API_BASE}/projects/${projectId}/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },
    async deleteTask(projectId, taskId) {
        await fetch(`${API_BASE}/projects/${projectId}/tasks/${taskId}`, { method: 'DELETE' });
    },
    async updateTaskStatus(projectId, taskId, status) {
        const res = await fetch(`${API_BASE}/projects/${projectId}/tasks/${taskId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        return res.json();
    },
    async assignTaskToCursor(projectId, taskId, instructions, files = [], workDir = '') {
        const res = await fetch(`${API_BASE}/projects/${projectId}/tasks/${taskId}/assign-cursor`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ instructions, files: files.filter(f => f.trim()), workDir })
        });
        return res.json();
    },
    async unassignTask(projectId, taskId) {
        const res = await fetch(`${API_BASE}/projects/${projectId}/tasks/${taskId}/unassign`, {
            method: 'POST'
        });
        return res.json();
    },
    async answerTaskQuestion(projectId, taskId, questionId, answer) {
        const res = await fetch(`${API_BASE}/projects/${projectId}/tasks/${taskId}/answer-question/${questionId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answer })
        });
        return res.json();
    },
    // Cursor management
    async approveCursor(projectId, taskId) {
        const res = await fetch(`${API_BASE}/projects/${projectId}/tasks/${taskId}/cursor-approve`, { method: 'POST' });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || 'Approve failed');
        return j;
    },
    async feedbackCursor(projectId, taskId, feedback) {
        const res = await fetch(`${API_BASE}/projects/${projectId}/tasks/${taskId}/cursor-feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ feedback })
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || 'Feedback failed');
        return j;
    },
    async revertCursor(projectId, taskId) {
        const res = await fetch(`${API_BASE}/projects/${projectId}/tasks/${taskId}/cursor-revert`, { method: 'POST' });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || 'Revert failed');
        return j;
    },
    async setCodeDir(projectId, codeDir) {
        const res = await fetch(`${API_BASE}/projects/${projectId}/code-dir`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ codeDir })
        });
        return res.json();
    },
    // Wizard API
    async getNextProjectCode() {
        const res = await fetch(`${API_BASE}/wizard/next-code`);
        return res.json();
    },
    async wizardWebSearch(query, maxResults = 8) {
        const res = await fetch(`${API_BASE}/wizard/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, max_results: maxResults })
        });
        return res.json();
    },
    async wizardAiGenerate(system, prompt, model) {
        const res = await fetch(`${API_BASE}/wizard/ai-generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ system, prompt, model })
        });
        return res.json();
    },
    async wizardFinalize(wizardData) {
        const res = await fetch(`${API_BASE}/wizard/finalize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(wizardData)
        });
        return res.json();
    },
    // Draft API
    async listDrafts() {
        const res = await fetch(`${API_BASE}/wizard/drafts`);
        return res.json();
    },
    async getDraft(id) {
        const res = await fetch(`${API_BASE}/wizard/drafts/${id}`);
        return res.json();
    },
    async saveDraft(data) {
        const res = await fetch(`${API_BASE}/wizard/drafts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },
    async updateDraft(id, data) {
        const res = await fetch(`${API_BASE}/wizard/drafts/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },
    async deleteDraft(id) {
        const res = await fetch(`${API_BASE}/wizard/drafts/${id}`, { method: 'DELETE' });
        return res.json();
    },
    // Document upload
    async uploadDocument(file) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${API_BASE}/wizard/upload-doc`, {
            method: 'POST',
            body: formData
        });
        return res.json();
    }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

const formatStatus = (status) => {
    const map = { 'backlog': 'Backlog', 'in-progress': 'In Progress', 'review': 'Review', 'done': 'Done', 'cancelled': 'Cancelled' };
    return map[status] || status;
};

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
};

const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('en-AU', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    });
};

const getDueDateClass = (dueDate) => {
    if (!dueDate) return '';
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'overdue';
    if (diffDays <= 3) return 'soon';
    return '';
};

// ============================================
// COMPONENTS
// ============================================

// Toast Component
const Toast = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`toast show ${type}`}>
            {message}
        </div>
    );
};

// Claude Status Badge Component
const ClaudeStatusBadge = ({ status }) => {
    const statusConfig = {
        'pending': { label: '🤖 Pending', className: 'claude-pending' },
        'working': { label: '🔄 Working', className: 'claude-working' },
        'needs-info': { label: '❓ Needs Info', className: 'claude-needs-info' },
        'completed': { label: '✅ Done', className: 'claude-completed' },
        'blocked': { label: '🚫 Blocked', className: 'claude-blocked' }
    };
    const config = statusConfig[status] || { label: status, className: '' };
    return <span className={`claude-status-badge ${config.className}`}>{config.label}</span>;
};

// Claude Review Modal Component
const ClaudeReviewModal = ({ isOpen, onClose, reviewData, loading, error, projectTitle }) => {
    if (!isOpen) return null;

    return (
        <div className="modal active" onClick={onClose}>
            <div className="modal-content modal-large claude-review-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>📋 Project Review: {projectTitle}</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    {loading && (
                        <div className="review-loading">
                            <div className="spinner"></div>
                            <p>Analyzing project state...</p>
                        </div>
                    )}

                    {!loading && error && (
                        <div className="review-error">
                            <p>⚠️ Review failed: {error}</p>
                        </div>
                    )}

                    {!loading && !error && reviewData && (
                        <div className="review-content">
                            <div className="review-timestamp">
                                Generated: {new Date(reviewData.timestamp).toLocaleString('en-AU', {
                                    day: 'numeric', month: 'short', year: 'numeric',
                                    hour: '2-digit', minute: '2-digit'
                                })}
                                {reviewData.model_used && <span className="review-model"> · {reviewData.model_used}</span>}
                            </div>

                            <div className="review-section">
                                <h3>📊 Project Snapshot</h3>
                                <div className="snapshot-grid">
                                    <div className="snapshot-item">
                                        <span className="label">Status:</span>
                                        <span className="value">{formatStatus(reviewData.project_snapshot?.status)}</span>
                                    </div>
                                    <div className="snapshot-item">
                                        <span className="label">Total Tasks:</span>
                                        <span className="value">{reviewData.project_snapshot?.task_count}</span>
                                    </div>
                                    <div className="snapshot-item">
                                        <span className="label">Recent Activity:</span>
                                        <span className="value">{reviewData.project_snapshot?.recent_activity} entries (7 days)</span>
                                    </div>
                                </div>
                            </div>

                            <div className="review-section">
                                <h3>🤖 Analysis</h3>
                                <div className="review-recommendations"
                                     dangerouslySetInnerHTML={{
                                         __html: renderMarkdown(reviewData.recommendations || 'No recommendations available')
                                     }}>
                                </div>
                            </div>
                        </div>
                    )}

                    {!loading && !error && !reviewData && (
                        <div className="review-error">
                            <p>No review data available</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Build copyable text for pasting into Cursor (task + project/file reference)
function buildCopyForCursorText(task, projectTitle, codeDir) {
    const lines = [
        `Task: ${task.title}`,
        '',
        task.description ? task.description.trim() : '(no description)',
        '',
        `Project: ${projectTitle || '(unknown)'}`,
        `Path: ${codeDir && codeDir.trim() ? codeDir.trim() : '(no path set)'}`
    ];
    return lines.join('\n');
}

// Copy text to clipboard; works over HTTP (fallback) and HTTPS. Returns true on success.
function copyToClipboard(text) {
    if (typeof navigator === 'undefined') return false;
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        return new Promise((resolve) => {
            navigator.clipboard.writeText(text).then(() => resolve(true)).catch(() => resolve(fallbackCopy(text)));
        });
    }
    return Promise.resolve(fallbackCopy(text));
}

function fallbackCopy(text) {
    try {
        const el = document.createElement('textarea');
        el.value = text;
        el.setAttribute('readonly', '');
        el.style.position = 'absolute';
        el.style.left = '-9999px';
        document.body.appendChild(el);
        el.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(el);
        return ok;
    } catch (e) {
        return false;
    }
}

// Task Item Component
const TaskItem = ({ task, projectId, projectTitle, codeDir, onStatusChange, onDelete, onAssign, onUnassign, onSelect, onCopyForCursor }) => {
    const statusCycle = { 'todo': 'in-progress', 'in-progress': 'done', 'done': 'todo' };
    const statusIcons = { 'todo': '○', 'in-progress': '◐', 'done': '●' };
    const statusClasses = { 'todo': 'task-todo', 'in-progress': 'task-in-progress', 'done': 'task-done' };

    return (
        <div className={`task-item ${statusClasses[task.status] || ''}`}>
            <button
                className={`task-status-btn ${statusClasses[task.status] || ''}`}
                onClick={() => onStatusChange(task.id, statusCycle[task.status] || 'todo')}
                title={`Status: ${task.status} (click to change)`}
            >
                {statusIcons[task.status] || '○'}
            </button>
            <span
                className={`task-title task-title-clickable ${task.status === 'done' ? 'task-title-done' : ''}`}
                onClick={() => onSelect && onSelect(task)}
                title="Click to view details"
            >
                {task.title}
            </span>
            <span className={`priority-dot priority-${task.priority || 'medium'}`}></span>
            {task.assignedTo && (
                <span className={`task-assigned-badge task-assigned-${task.assignedTo}`}>
                    🔧 {task.assignedTo}
                    {task.claudeStatus && <span className="task-claude-status"> ({task.claudeStatus})</span>}
                </span>
            )}
            {!task.assignedTo && (
                <button className="task-assign-btn" onClick={() => onAssign(task.id)} title="Assign task">
                    ⚡
                </button>
            )}
            {task.assignedTo && (
                <button className="task-unassign-btn" onClick={() => onUnassign(task.id)} title="Unassign">
                    ✕
                </button>
            )}
            <button className="task-delete-btn" onClick={() => onDelete(task.id)} title="Delete task">
                🗑
            </button>
            {onCopyForCursor && (
                <button
                    className="task-copy-cursor-btn"
                    onClick={async () => {
                        const text = buildCopyForCursorText(task, projectTitle, codeDir);
                        const ok = await copyToClipboard(text);
                        onCopyForCursor(ok);
                    }}
                    title="Copy task + file reference for Cursor"
                >
                    📋
                </button>
            )}
        </div>
    );
};

// Task List Component
const TaskList = ({ project, onRefresh, showToast }) => {
    const [newTitle, setNewTitle] = useState('');
    const [newPriority, setNewPriority] = useState('medium');
    const [assigningTaskId, setAssigningTaskId] = useState(null);
    const [assignInstructions, setAssignInstructions] = useState('');
    const [assignFiles, setAssignFiles] = useState('');
    const [selectedTaskId, setSelectedTaskId] = useState(null);

    const tasks = project.tasks || [];
    // Always derive from live project data so Cursor updates are reflected
    const selectedTask = tasks.find(t => t.id === selectedTaskId) || null;
    const doneCount = tasks.filter(t => t.status === 'done').length;

    const handleAddTask = async () => {
        if (!newTitle.trim()) return;
        try {
            await api.createTask(project.id, { title: newTitle.trim(), priority: newPriority });
            setNewTitle('');
            setNewPriority('medium');
            showToast('Task added');
            onRefresh();
        } catch (error) {
            showToast('Failed to add task', 'error');
        }
    };

    const handleStatusChange = async (taskId, newStatus) => {
        try {
            await api.updateTaskStatus(project.id, taskId, newStatus);
            onRefresh();
        } catch (error) {
            showToast('Failed to update task status', 'error');
        }
    };

    const handleDelete = async (taskId) => {
        try {
            await api.deleteTask(project.id, taskId);
            showToast('Task deleted');
            onRefresh();
        } catch (error) {
            showToast('Failed to delete task', 'error');
        }
    };

    const handleAssignStart = (taskId) => {
        setAssigningTaskId(taskId);
        setAssignInstructions('');
        setAssignFiles('');
    };

    const handleAssignConfirm = async () => {
        if (!assigningTaskId) return;
        try {
            const files = assignFiles.split('\n').map(f => f.trim()).filter(Boolean);
            await api.assignTaskToCursor(project.id, assigningTaskId, assignInstructions, files);
            showToast('Task queued for autonomous build');
            setAssigningTaskId(null);
            setAssignInstructions('');
            setAssignFiles('');
            onRefresh();
        } catch (error) {
            showToast('Failed to assign task', 'error');
        }
    };

    const handleUnassign = async (taskId) => {
        try {
            await api.unassignTask(project.id, taskId);
            showToast('Task unassigned');
            onRefresh();
        } catch (error) {
            showToast('Failed to unassign task', 'error');
        }
    };

    const groups = [
        {
            key: 'review',
            label: '👀 Review',
            filter: t => t.assignedTo === 'cursor' && t.claudeStatus === 'review',
        },
        {
            key: 'working',
            label: '⚡ Working',
            filter: t => t.assignedTo === 'cursor' && t.claudeStatus !== 'review',
        },
        {
            key: 'todo',
            label: '○ Todo',
            filter: t => !t.assignedTo && t.status !== 'done',
        },
        {
            key: 'done',
            label: '● Done',
            filter: t => t.status === 'done',
        },
    ];

    const renderGroup = (group) => {
        const groupTasks = tasks.filter(group.filter);
        if (groupTasks.length === 0) return null;
        return (
            <div key={group.key} className="task-group">
                <div className={`task-group-header task-group-${group.key}`}>
                    {group.label}
                    <span className="task-group-count">{groupTasks.length}</span>
                </div>
                <div className="task-items">
                    {groupTasks.map(task => (
                        <TaskItem
                            key={task.id}
                            task={task}
                            projectId={project.id}
                            projectTitle={project.title}
                            codeDir={project.codeDir}
                            onStatusChange={handleStatusChange}
                            onDelete={handleDelete}
                            onAssign={handleAssignStart}
                            onUnassign={handleUnassign}
                            onSelect={(t) => setSelectedTaskId(t.id)}
                            onCopyForCursor={(ok) => showToast(ok ? 'Copied for Cursor — paste in Cursor chat' : 'Copy failed — try opening task and use the button there', ok ? undefined : 'error')}
                        />
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="task-list-container">
            {tasks.length > 0 && (
                <div className="task-summary">
                    {doneCount}/{tasks.length} tasks done
                    <div className="task-progress-bar">
                        <div
                            className="task-progress-fill"
                            style={{ width: tasks.length > 0 ? `${(doneCount / tasks.length) * 100}%` : '0%' }}
                        ></div>
                    </div>
                </div>
            )}

            {groups.map(renderGroup)}

            {/* Autonomous assign form */}
            {assigningTaskId && (
                <div className="task-assign-form">
                    <span className="task-assign-label">⚡ Autonomous — additional instructions (optional):</span>
                    <textarea
                        value={assignInstructions}
                        onChange={(e) => setAssignInstructions(e.target.value)}
                        placeholder="Any extra context or constraints..."
                        rows={2}
                        className="task-assign-textarea"
                    />
                    <span className="task-assign-label" style={{marginTop: '4px', opacity: 0.7}}>Override files (leave blank to auto-detect):</span>
                    <textarea
                        value={assignFiles}
                        onChange={(e) => setAssignFiles(e.target.value)}
                        placeholder={`e.g.\nfrontend/styles.css\nbackend/app.py`}
                        rows={2}
                        className="task-assign-textarea"
                        style={{fontFamily: 'monospace', fontSize: '12px'}}
                    />
                    <div className="task-assign-actions">
                        <button className="btn btn-small btn-primary" onClick={handleAssignConfirm}>
                            Build
                        </button>
                        <button className="btn btn-small btn-secondary" onClick={() => { setAssigningTaskId(null); setAssignFiles(''); }}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Add task inline form */}
            <div className="task-add-form">
                <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Add a task..."
                    className="task-add-input"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddTask();
                    }}
                />
                <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="task-add-priority"
                >
                    <option value="low">Low</option>
                    <option value="medium">Med</option>
                    <option value="high">High</option>
                    <option value="critical">Crit</option>
                </select>
                <button className="btn btn-small btn-primary" onClick={handleAddTask}>Add</button>
            </div>

            {/* Task detail overlay */}
            {selectedTask && (
                <div className="task-detail-overlay" onClick={() => setSelectedTaskId(null)}>
                    <div className="task-detail-overlay-panel" onClick={(e) => e.stopPropagation()}>
                        <TaskDetailPanel
                            task={selectedTask}
                            project={project}
                            onClose={() => setSelectedTaskId(null)}
                            onRefresh={onRefresh}
                            showToast={showToast}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

// Task Progress indicator for ProjectCard
const TaskProgress = ({ tasks }) => {
    if (!tasks || tasks.length === 0) return null;
    const doneCount = tasks.filter(t => t.status === 'done').length;
    const pct = (doneCount / tasks.length) * 100;

    return (
        <div className="card-task-progress">
            <span className="card-task-count">{doneCount}/{tasks.length} tasks</span>
            <div className="card-task-bar">
                <div className="card-task-bar-fill" style={{ width: `${pct}%` }}></div>
            </div>
        </div>
    );
};

// Task Board Card (card within the task board kanban)
const TaskBoardCard = ({ task, onSelect, isSelected }) => {
    const handleDragStart = (e) => {
        e.dataTransfer.setData('taskId', task.id);
    };

    return (
        <div
            className={`tb-card ${isSelected ? 'tb-card-selected' : ''} ${task.assignedTo ? 'tb-card-assigned' : ''}`}
            onClick={() => onSelect(task)}
            draggable
            onDragStart={handleDragStart}
        >
            <div className="tb-card-header">
                <span className="tb-card-title">{task.title}</span>
                <span className={`priority-dot priority-${task.priority || 'medium'}`}></span>
            </div>
            {task.description && (
                <p className="tb-card-desc">{task.description}</p>
            )}
            <div className="tb-card-footer">
                {task.assignedTo && (
                    <span className={`task-assigned-badge task-assigned-${task.assignedTo}`}>
                        🔧 {task.assignedTo}
                        {task.claudeStatus && ` (${task.claudeStatus})`}
                    </span>
                )}
                {(task.claudeUpdates || []).length > 0 && (
                    <span className="tb-card-log-count">{task.claudeUpdates.length} updates</span>
                )}
            </div>
        </div>
    );
};

// Task Board Column
const TaskBoardColumn = ({ status, title, tasks, onSelect, selectedTaskId, onDrop, onDragOver, onDragLeave }) => {
    const columnTasks = tasks.filter(t => t.status === status);
    return (
        <div className="tb-column" data-status={status}>
            <div className="tb-column-header">
                <h3>{title}</h3>
                <span className="task-count">{columnTasks.length}</span>
            </div>
            <div
                className="tb-column-content"
                onDrop={(e) => onDrop(e, status)}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
            >
                {columnTasks.map(task => (
                    <TaskBoardCard
                        key={task.id}
                        task={task}
                        onSelect={onSelect}
                        isSelected={task.id === selectedTaskId}
                    />
                ))}
            </div>
        </div>
    );
};

// Task Detail Panel (right sidebar in task board)
const TaskDetailPanel = ({ task, project, onClose, onRefresh, showToast }) => {
    const [showAssign, setShowAssign] = useState(false);
    const [assignInstructions, setAssignInstructions] = useState('');
    const [assignFiles, setAssignFiles] = useState('');
    const [answeringQId, setAnsweringQId] = useState(null);
    const [answer, setAnswer] = useState('');
    const [reviewFeedback, setReviewFeedback] = useState('');
    const [peekOpen, setPeekOpen] = useState(false);

    useEffect(() => {
        if (!task || !peekOpen || task.assignedTo !== 'cursor' || !['pending', 'working'].includes(task.claudeStatus)) return;
        const iv = setInterval(onRefresh, 5000);
        return () => clearInterval(iv);
    }, [task?.id, task?.assignedTo, task?.claudeStatus, peekOpen, onRefresh]);

    const handleReviewApprove = async () => {
        try {
            await api.approveCursor(project.id, task.id);
            showToast('Approved — task marked done');
            onRefresh();
        } catch (e) {
            showToast(e?.message || 'Failed to approve', 'error');
        }
    };

    const handleReviewFeedback = async () => {
        if (!reviewFeedback.trim()) return;
        try {
            await api.feedbackCursor(project.id, task.id, reviewFeedback.trim());
            showToast('Feedback sent — Cursor will see it next run');
            setReviewFeedback('');
            onRefresh();
        } catch (e) {
            showToast('Failed to send feedback', 'error');
        }
    };

    const handleRevert = async () => {
        if (!confirm('Revert will discard the branch and unassign. Continue?')) return;
        try {
            await api.revertCursor(project.id, task.id);
            showToast('Reverted');
            onRefresh();
        } catch (e) {
            showToast(e?.message || 'Revert failed', 'error');
        }
    };

    if (!task) return (
        <div className="tb-detail-panel tb-detail-empty">
            <p>Select a task to view details</p>
        </div>
    );

    const handleAssign = async () => {
        try {
            const files = assignFiles.split('\n').map(f => f.trim()).filter(Boolean);
            await api.assignTaskToCursor(project.id, task.id, assignInstructions, files);
            showToast('Task queued for autonomous build');
            setShowAssign(false);
            setAssignInstructions('');
            setAssignFiles('');
            onRefresh();
        } catch (error) {
            showToast('Failed to assign', 'error');
        }
    };

    const handleStatusCycle = async () => {
        const cycle = { 'todo': 'in-progress', 'in-progress': 'done', 'done': 'todo' };
        const next = cycle[task.status] || 'todo';
        try {
            await api.updateTaskStatus(project.id, task.id, next);
            onRefresh();
        } catch (error) {
            showToast('Failed to update status', 'error');
        }
    };

    const handleUnassign = async () => {
        try {
            await api.unassignTask(project.id, task.id);
            showToast('Unassigned');
            onRefresh();
        } catch (error) {
            showToast('Failed to unassign', 'error');
        }
    };

    const handleAnswerQuestion = async (qId) => {
        if (!answer.trim()) return;
        try {
            await api.answerTaskQuestion(project.id, task.id, qId, answer);
            showToast('Answer submitted');
            setAnsweringQId(null);
            setAnswer('');
            onRefresh();
        } catch (error) {
            showToast('Failed to submit answer', 'error');
        }
    };

    const unansweredQuestions = (task.claudeQuestions || []).filter(q => !q.answered);

    return (
        <div className="tb-detail-panel">
            <div className="tb-detail-header">
                <h3>{task.title}</h3>
                <button className="close-btn" onClick={onClose}>×</button>
            </div>

            <div className="tb-detail-body">
                {/* Meta */}
                <div className="tb-detail-meta">
                    <span className={`priority-badge ${task.priority}`}>{task.priority || 'medium'}</span>
                    <button
                        className={`status-badge tb-status-${task.status} status-badge-btn`}
                        onClick={handleStatusCycle}
                        title="Click to change status"
                    >
                        {task.status === 'todo' ? 'Todo' : task.status === 'in-progress' ? 'In Progress' : 'Done'}
                    </button>
                </div>

                {/* Description */}
                {task.description && (
                    <div className="tb-detail-section">
                        <h4>Description</h4>
                        <p>{task.description}</p>
                    </div>
                )}

                {/* Copy for Cursor — paste task + file ref into Cursor chat */}
                <div className="tb-detail-section tb-copy-cursor-section">
                    <button
                        className="btn btn-copy-cursor"
                        onClick={async () => {
                            const text = buildCopyForCursorText(task, project?.title, project?.codeDir);
                            const ok = await copyToClipboard(text);
                            showToast(ok ? 'Copied for Cursor — paste in Cursor chat' : 'Copy failed — text is in the task description; select and copy manually', ok ? undefined : 'error');
                        }}
                        title="Copy task and project path for pasting into Cursor"
                    >
                        📋 Copy for Cursor
                    </button>
                </div>

                {/* Assign to Cursor */}
                <div className="tb-detail-section">
                    <h4>Assignment</h4>
                    {showAssign ? (
                        <div className="tb-assign-form">
                            <span className="tb-assign-label">⚡ Additional instructions (optional):</span>
                            <textarea
                                value={assignInstructions}
                                onChange={(e) => setAssignInstructions(e.target.value)}
                                placeholder="Any extra context or constraints..."
                                rows={3}
                            />
                            <span className="tb-assign-label" style={{marginTop: '8px', opacity: 0.7}}>Override files (leave blank to auto-detect):</span>
                            <textarea
                                value={assignFiles}
                                onChange={(e) => setAssignFiles(e.target.value)}
                                placeholder={`Leave blank for auto-detect\ne.g.\nfrontend/styles.css\nbackend/app.py`}
                                rows={3}
                                style={{fontFamily: 'monospace', fontSize: '12px'}}
                            />
                            <div className="tb-assign-actions">
                                <button className="btn btn-primary btn-small" onClick={handleAssign}>Build</button>
                                <button className="btn btn-secondary btn-small" onClick={() => { setShowAssign(false); setAssignFiles(''); }}>Cancel</button>
                            </div>
                        </div>
                    ) : task.assignedTo ? (
                        <div className="tb-assignment-info">
                            <div className="tb-assignment-row">
                                <span className={`task-assigned-badge task-assigned-${task.assignedTo}`}>
                                    🔧 {task.assignedTo}
                                </span>
                                {task.claudeStatus && <ClaudeStatusBadge status={task.claudeStatus} />}
                            </div>
                            {task.claudeInstructions && (
                                <div className="tb-instructions">
                                    <span className="tb-instructions-label">Instructions:</span>
                                    <p>{task.claudeInstructions}</p>
                                </div>
                            )}
                            <div className="tb-assign-actions-inline">
                                {task.assignedTo === 'cursor' && (
                                    <button className="btn btn-small btn-secondary" onClick={() => { setAssignInstructions(task.claudeInstructions || ''); setShowAssign(true); }}>
                                        Re-run
                                    </button>
                                )}
                                <button className="btn btn-small btn-secondary" onClick={handleUnassign}>
                                    Unassign
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="tb-push-buttons">
                            <button className="btn btn-cursor" onClick={() => setShowAssign(true)}>
                                ⚡ Build
                            </button>
                        </div>
                    )}
                </div>

                {/* Peek — Cursor updates, when assigned */}
                {task.assignedTo === 'cursor' && (
                    <div className="cursor-peek tb-detail-peek">
                        <button
                            type="button"
                            className={`btn btn-small ${peekOpen ? 'active' : ''}`}
                            onClick={() => setPeekOpen(!peekOpen)}
                            title="See what Cursor is doing"
                        >
                            {peekOpen ? '▲ Hide Peek' : '▼ Peek'}
                            {(task.claudeUpdates || []).length > 0 && (
                                <span className="cursor-peek-count"> {(task.claudeUpdates || []).length}</span>
                            )}
                        </button>
                        {peekOpen && (
                            <div className="cursor-peek-log">
                                {(task.claudeUpdates || []).length === 0 ? (
                                    <p className="cursor-peek-empty">
                                        {task.cursorAgentId
                                            ? 'Cloud agent running. Status updates will appear here.'
                                            : 'No updates yet. Set CURSOR_API_KEY and project GitHub repo to use cloud agents, or open Cursor and say &quot;work on my assigned kanban tasks&quot;.'}
                                    </p>
                                ) : (
                                    [...(task.claudeUpdates || [])].map(u => (
                                        <div key={u.id || u.timestamp} className={`cursor-peek-entry cursor-peek-${u.type}`}>
                                            <span className="cursor-peek-type">{u.type}</span>
                                            <span className="cursor-peek-time">{formatDateTime(u.timestamp)}</span>
                                            <p className="cursor-peek-content">{u.content}</p>
                                            {(u.output_files || []).length > 0 && (
                                                <div className="cursor-peek-files">
                                                    {(u.output_files || []).map((f, i) => (
                                                        <span key={i} className="cursor-peek-file">{f.name || f.path}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Cursor Review — inline when task is awaiting review */}
                {task.assignedTo === 'cursor' && task.claudeStatus === 'review' && (() => {
                    const reviewUpdate = [...(task.claudeUpdates || [])].reverse().find(u => u.type === 'review');
                    return (
                        <div className="tb-detail-section tb-cursor-review-section">
                            <h4>👀 Cursor Review</h4>
                            {reviewUpdate ? (
                                <div className="tb-review-summary">
                                    {reviewUpdate.content.split('\n').filter(l => l.trim()).map((line, i) => (
                                        <p key={i} className={
                                            line.startsWith('**') ? 'tb-review-heading' :
                                            line.startsWith('-') || line.startsWith('•') ? 'tb-review-bullet' :
                                            'tb-review-line'
                                        }>{line.replace(/\*\*/g, '')}</p>
                                    ))}
                                </div>
                            ) : (
                                <p className="empty-text">Waiting for review summary...</p>
                            )}
                            {task.cursorBranch && (
                                <p className="tb-review-branch"><code>{task.cursorBranch}</code></p>
                            )}
                            <textarea
                                className="tb-review-feedback"
                                value={reviewFeedback}
                                onChange={e => setReviewFeedback(e.target.value)}
                                placeholder="Request changes (optional). Cursor will see this next run."
                                rows={3}
                            />
                            <div className="tb-review-actions">
                                <button className="btn btn-success btn-small" onClick={handleReviewApprove}>
                                    ✅ Approve
                                </button>
                                <button
                                    className="btn btn-primary btn-small"
                                    onClick={handleReviewFeedback}
                                    disabled={!reviewFeedback.trim()}
                                >
                                    🔁 Request Changes
                                </button>
                                <button className="btn btn-danger btn-small" onClick={handleRevert} title="Discard branch and unassign">
                                    ↩ Revert
                                </button>
                            </div>
                        </div>
                    );
                })()}

                {/* Questions from Cursor */}
                {unansweredQuestions.length > 0 && (
                    <div className="tb-detail-section">
                        <h4>Questions from Cursor</h4>
                        {unansweredQuestions.map(q => (
                            <div key={q.id} className="question-card">
                                <p className="question-text">{q.question}</p>
                                {q.context && <p className="question-context">{q.context}</p>}
                                {answeringQId === q.id ? (
                                    <div className="answer-form">
                                        <textarea
                                            value={answer}
                                            onChange={(e) => setAnswer(e.target.value)}
                                            placeholder="Your answer..."
                                            rows={2}
                                        />
                                        <div className="answer-actions">
                                            <button className="btn btn-primary btn-small" onClick={() => handleAnswerQuestion(q.id)}>Submit</button>
                                            <button className="btn btn-secondary btn-small" onClick={() => { setAnsweringQId(null); setAnswer(''); }}>Cancel</button>
                                        </div>
                                    </div>
                                ) : (
                                    <button className="btn btn-primary btn-small" onClick={() => setAnsweringQId(q.id)}>Answer</button>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* AI Work Log */}
                <div className="tb-detail-section">
                    <h4>AI Work Log ({(task.claudeUpdates || []).length})</h4>
                    <div className="tb-worklog">
                        {(task.claudeUpdates || []).length === 0 ? (
                            <p className="empty-text">No updates yet.</p>
                        ) : (
                            (() => {
                                const updates = [...(task.claudeUpdates || [])];
                                const getFiles = (u) => (u.output_files || []);
                                return updates.map(update => {
                                    const files = getFiles(update);
                                    return (
                                        <div key={update.id} className={`tb-log-entry tb-log-${update.type}`}>
                                            <div className="tb-log-header">
                                                <span className="tb-log-type">{update.type}</span>
                                                <span className="tb-log-time">{formatDateTime(update.timestamp)}</span>
                                            </div>
                                            <p className="tb-log-content">{update.content}</p>
                                            {files.length > 0 && (
                                                <div className="tb-output-files">
                                                    {files.map((f, i) => (
                                                        <span key={i} className="tb-output-file-bubble">{f.name || f.path}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                });
                            })()
                        )}
                    </div>
                    {((task.outputFiles || task.bureauOutputFiles) || []).length > 0 && (
                        <div className="tb-output-files-section">
                            <h5>Output files</h5>
                            <div className="tb-output-files">
                                {((task.outputFiles || task.bureauOutputFiles) || []).map((f, i) => (
                                    <span key={i} className="tb-output-file-bubble">{f.name || f.path}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Documents Panel Component (Librarian)
const DocsPanel = ({ project, onRefresh }) => {
    const [docs, setDocs] = useState([]);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [docContent, setDocContent] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState('related'); // 'related' | 'search' | 'reading'
    const [docQuery, setDocQuery] = useState(project?.docQuery || '');
    const [editingQuery, setEditingQuery] = useState(false);

    // Auto-search for project-related docs using full-text search
    const fetchRelatedDocs = useCallback((query) => {
        if (!query) return;
        setLoading(true);
        fetch(`${API_BASE}/docs/search?q=${encodeURIComponent(query)}`)
            .then(r => r.json())
            .then(data => {
                setDocs(data.results || []);
            })
            .catch(() => setDocs([]))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        const query = project?.docQuery || project?.title;
        if (query) {
            setDocQuery(project?.docQuery || '');
            fetchRelatedDocs(query);
        }
    }, [project?.id]);

    const saveDocQuery = async (newQuery) => {
        setEditingQuery(false);
        const trimmed = newQuery.trim();
        setDocQuery(trimmed);
        // Save to project
        try {
            await fetch(`${API_BASE}/projects/${project.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ docQuery: trimmed })
            });
            if (onRefresh) onRefresh();
        } catch (e) { /* ignore save errors */ }
        // Re-fetch with new query (or fall back to title)
        fetchRelatedDocs(trimmed || project?.title);
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/docs/search?q=${encodeURIComponent(searchQuery.trim())}`);
            const data = await res.json();
            setSearchResults(data.results || []);
            setView('search');
        } catch (e) {
            setSearchResults([]);
        }
        setLoading(false);
    };

    const handleOpenDoc = async (category, name) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/docs/${category}/${name}`);
            const data = await res.json();
            setDocContent(data.content || 'Could not load document.');
            setSelectedDoc({ category, name });
            setView('reading');
        } catch (e) {
            setDocContent('Failed to load document.');
        }
        setLoading(false);
    };

    const renderDocList = (items) => {
        if (!items || items.length === 0) {
            return <p className="empty-text">No documents found.</p>;
        }
        return items.map((doc, i) => (
            <div
                key={i}
                className="docs-item"
                onClick={() => handleOpenDoc(doc.category, doc.name)}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <span className="docs-item-category">{doc.category}</span>
                        <span className="docs-item-name">{doc.name || doc.filename}</span>
                    </div>
                </div>
            </div>
        ));
    };

    return (
        <div className="docs-panel-content">
            {/* Search bar */}
            <div className="docs-search-bar">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search docs..."
                    className="docs-search-input"
                    onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
                />
                <button className="btn btn-small btn-primary" onClick={handleSearch}>Search</button>
            </div>

            {loading && <p className="docs-loading">Loading...</p>}

            {view === 'reading' && selectedDoc ? (
                <div className="docs-reader">
                    <button className="btn btn-small btn-secondary" onClick={() => setView(searchResults.length > 0 ? 'search' : 'related')}>
                        ← Back
                    </button>
                    <h4 className="docs-reader-title">{selectedDoc.name}</h4>
                    <div className="docs-reader-content">{docContent}</div>
                </div>
            ) : view === 'search' ? (
                <div className="docs-results">
                    <div className="docs-section-header">
                        <h4>Search Results ({searchResults.length})</h4>
                        <button className="btn btn-small" onClick={() => setView('related')}>Related</button>
                    </div>
                    {renderDocList(searchResults)}
                </div>
            ) : (
                <div className="docs-results">
                    <div className="docs-section-header">
                        <h4>Related Documents</h4>
                    </div>
                    <div className="docs-query-row">
                        {editingQuery ? (
                            <div className="docs-query-edit">
                                <input
                                    type="text"
                                    value={docQuery}
                                    onChange={e => setDocQuery(e.target.value)}
                                    placeholder={project?.title || 'Search term...'}
                                    className="docs-search-input"
                                    autoFocus
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') saveDocQuery(docQuery);
                                        if (e.key === 'Escape') { setEditingQuery(false); setDocQuery(project?.docQuery || ''); }
                                    }}
                                />
                                <button className="btn btn-small btn-primary" onClick={() => saveDocQuery(docQuery)}>Save</button>
                                <button className="btn btn-small" onClick={() => { setEditingQuery(false); setDocQuery(project?.docQuery || ''); }}>Cancel</button>
                            </div>
                        ) : (
                            <div className="docs-query-display">
                                <span className="docs-query-label">Linked by:</span>
                                <span className="docs-query-value">{project?.docQuery || project?.title}</span>
                                <button className="btn btn-small" onClick={() => setEditingQuery(true)}>Edit</button>
                            </div>
                        )}
                    </div>
                    {renderDocList(docs)}
                </div>
            )}
        </div>
    );
};

// Cursor Panel — shows tasks assigned to Cursor, instructions, and approve flow
const CursorPanel = ({ project, onRefresh, showToast }) => {
    const [activeTaskId, setActiveTaskId] = useState(null);
    const [codeDir, setCodeDir] = useState(project?.codeDir || '');
    const [editingDir, setEditingDir] = useState(false);
    const [peekOpen, setPeekOpen] = useState(false);

    const cursorTasks = (project?.tasks || []).filter(t => t.assignedTo === 'cursor');
    const activeTask = cursorTasks.find(t => t.id === activeTaskId) || null;

    useEffect(() => {
        if (!activeTaskId && cursorTasks.length > 0) {
            setActiveTaskId(cursorTasks[0].id);
        }
    }, [cursorTasks.length]);

    // Auto-refresh when Peek is open to see live Cursor updates
    useEffect(() => {
        if (!peekOpen || !activeTask || !['pending', 'working'].includes(activeTask.claudeStatus)) return;
        const iv = setInterval(onRefresh, 5000);
        return () => clearInterval(iv);
    }, [peekOpen, activeTask?.id, activeTask?.claudeStatus, onRefresh]);

    const [feedback, setFeedback] = useState('');

    const handleApprove = async () => {
        if (!activeTask) return;
        try {
            await api.approveCursor(project.id, activeTask.id);
            showToast('Approved — task marked done');
            setActiveTaskId(null);
            onRefresh();
        } catch (e) {
            showToast(e?.message || 'Failed to approve', 'error');
        }
    };

    const handleFeedback = async () => {
        if (!activeTask || !feedback.trim()) return;
        try {
            await api.feedbackCursor(project.id, activeTask.id, feedback.trim());
            showToast('Feedback sent — Cursor will see it next run');
            setFeedback('');
            onRefresh();
        } catch (e) {
            showToast('Failed to send feedback', 'error');
        }
    };

    const handleRevert = async () => {
        if (!activeTask) return;
        if (!confirm('Revert will discard the branch and unassign. Continue?')) return;
        try {
            await api.revertCursor(project.id, activeTask.id);
            showToast('Reverted');
            setActiveTaskId(null);
            onRefresh();
        } catch (e) {
            showToast(e?.message || 'Revert failed', 'error');
        }
    };

    const handleSaveCodeDir = async () => {
        try {
            await api.setCodeDir(project.id, codeDir);
            showToast('Code directory set');
            setEditingDir(false);
            onRefresh();
        } catch (e) {
            showToast('Failed to set code dir', 'error');
        }
    };

    return (
        <div className="cursor-panel">
            <div className="cursor-config">
                <div className="cursor-config-row">
                    <span className="cursor-config-label">Code Dir:</span>
                    {editingDir ? (
                        <div className="cursor-dir-edit">
                            <input
                                type="text"
                                value={codeDir}
                                onChange={e => setCodeDir(e.target.value)}
                                placeholder="/path/to/project"
                                className="cursor-dir-input"
                                onKeyDown={e => { if (e.key === 'Enter') handleSaveCodeDir(); }}
                            />
                            <button className="btn btn-small btn-primary" onClick={handleSaveCodeDir}>Save</button>
                            <button className="btn btn-small" onClick={() => setEditingDir(false)}>Cancel</button>
                        </div>
                    ) : (
                        <div className="cursor-dir-display">
                            <span className="cursor-dir-value">{project?.codeDir || '~ (default)'}</span>
                            <button className="btn btn-small" onClick={() => { setCodeDir(project?.codeDir || ''); setEditingDir(true); }}>Edit</button>
                        </div>
                    )}
                </div>
            </div>

            {cursorTasks.length > 0 ? (
                <div className="cursor-tasks">
                    <div className="cursor-task-list">
                        {cursorTasks.map(t => (
                            <div
                                key={t.id}
                                className={`cursor-task-item ${activeTask?.id === t.id ? 'active' : ''}`}
                                onClick={() => setActiveTaskId(t.id)}
                            >
                                <span className={`cursor-run-dot ${t.claudeStatus === 'working' || t.claudeStatus === 'pending' ? 'running' : t.claudeStatus === 'review' ? 'review' : t.claudeStatus === 'completed' ? 'done' : 'stopped'}`}></span>
                                <span className="cursor-task-name">{t.title}</span>
                                <span className="cursor-task-status">{t.claudeStatus}</span>
                            </div>
                        ))}
                    </div>

                    {activeTask && (
                        <div className="cursor-output">
                            <div className="cursor-output-header">
                                <span className="cursor-output-title">
                                    {activeTask.claudeStatus === 'review' ? '👀 Review' : activeTask.claudeStatus || 'Pending'}
                                </span>
                            </div>
                            {activeTask.claudeInstructions && (
                                <div className="cursor-instructions">
                                    <strong>Instructions:</strong>
                                    <pre className="cursor-instructions-text">{activeTask.claudeInstructions}</pre>
                                </div>
                            )}
                            {(activeTask.cursorFiles || []).length > 0 && (
                                <div className="cursor-files">
                                    <strong>Override files:</strong>
                                    <ul>{activeTask.cursorFiles.map((f, i) => <li key={i}>{f}</li>)}</ul>
                                </div>
                            )}
                            <div className="cursor-peek">
                                <button
                                    type="button"
                                    className={`btn btn-small ${peekOpen ? 'active' : ''}`}
                                    onClick={() => setPeekOpen(!peekOpen)}
                                    title="See Cursor updates"
                                >
                                    {peekOpen ? '▲ Hide Peek' : '▼ Peek'}
                                    {(activeTask.claudeUpdates || []).length > 0 && (
                                        <span className="cursor-peek-count"> {(activeTask.claudeUpdates || []).length}</span>
                                    )}
                                </button>
                                {peekOpen && (
                                    <div className="cursor-peek-log">
                                        {(activeTask.claudeUpdates || []).length === 0 ? (
                                            <p className="cursor-peek-empty">
                                                {activeTask.cursorAgentId
                                                    ? 'Cloud agent running. Status updates will appear here.'
                                                    : 'No updates yet. Set CURSOR_API_KEY and project GitHub repo to use cloud agents, or open Cursor and say &quot;work on my assigned kanban tasks&quot;.'}
                                            </p>
                                        ) : (
                                            [...(activeTask.claudeUpdates || [])].map(u => (
                                                <div key={u.id || u.timestamp} className={`cursor-peek-entry cursor-peek-${u.type}`}>
                                                    <span className="cursor-peek-type">{u.type}</span>
                                                    <span className="cursor-peek-time">{formatDateTime(u.timestamp)}</span>
                                                    <p className="cursor-peek-content">{u.content}</p>
                                                    {(u.output_files || []).length > 0 && (
                                                        <div className="cursor-peek-files">
                                                            {(u.output_files || []).map((f, i) => (
                                                                <span key={i} className="cursor-peek-file">{f.name || f.path}</span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                            {activeTask.claudeStatus === 'review' && (() => {
                                const reviewUpdate = [...(activeTask.claudeUpdates || [])].reverse().find(u => u.type === 'review');
                                return reviewUpdate ? (
                                    <div className="cursor-review-summary">
                                        {reviewUpdate.content.split('\n').map((line, i) => (
                                            <p key={i} className={line.startsWith('**') ? 'cursor-review-heading' : line.startsWith('-') || line.startsWith('•') ? 'cursor-review-bullet' : 'cursor-review-line'}>{line.replace(/\*\*/g, '')}</p>
                                        ))}
                                    </div>
                                ) : null;
                            })()}
                            {activeTask.claudeStatus === 'review' && (
                                <>
                                    {activeTask.cursorBranch && (
                                        <p className="cursor-branch"><code>{activeTask.cursorBranch}</code></p>
                                    )}
                                    <textarea
                                        className="cursor-feedback-input"
                                        value={feedback}
                                        onChange={e => setFeedback(e.target.value)}
                                        placeholder="Request changes (optional). Cursor sees this next run."
                                        rows={3}
                                    />
                                    <div className="cursor-review-actions">
                                        <button className="btn btn-success" onClick={handleApprove}>✅ Approve</button>
                                        <button className="btn btn-primary" onClick={handleFeedback} disabled={!feedback.trim()}>🔁 Request Changes</button>
                                        <button className="btn btn-danger" onClick={handleRevert} title="Discard branch and unassign">↩ Revert</button>
                                    </div>
                                </>
                            )}
                            <p className="cursor-hint">Open Cursor and say: &quot;work on my assigned kanban tasks&quot;. Cursor will use MCP to update the work log.</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="cursor-empty">
                    <p>No tasks assigned to Cursor.</p>
                    <p className="cursor-hint">Assign a task from the Task tab to queue work for Cursor.</p>
                </div>
            )}
        </div>
    );
};

// Task Board - Full view for a single project
const TaskBoard = ({ project, projects, onBack, onRefresh, onEditProject, showToast }) => {
    const [selectedTask, setSelectedTask] = useState(null);
    const [showAddTask, setShowAddTask] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState('medium');
    const [newTaskDesc, setNewTaskDesc] = useState('');
    const [rightPanel, setRightPanel] = useState('task'); // 'task' | 'chat' | 'docs'

    const tasks = project.tasks || [];

    // Keep selectedTask in sync with refreshed project data
    const currentSelectedTask = selectedTask
        ? tasks.find(t => t.id === selectedTask.id) || null
        : null;

    const handleAddTask = async () => {
        if (!newTaskTitle.trim()) return;
        try {
            await api.createTask(project.id, {
                title: newTaskTitle.trim(),
                description: newTaskDesc.trim(),
                priority: newTaskPriority
            });
            setNewTaskTitle('');
            setNewTaskDesc('');
            setNewTaskPriority('medium');
            setShowAddTask(false);
            showToast('Task created');
            onRefresh();
        } catch (error) {
            showToast('Failed to create task', 'error');
        }
    };

    const handleDeleteTask = async (taskId) => {
        if (!confirm('Delete this task?')) return;
        try {
            await api.deleteTask(project.id, taskId);
            if (selectedTask?.id === taskId) setSelectedTask(null);
            showToast('Task deleted');
            onRefresh();
        } catch (error) {
            showToast('Failed to delete task', 'error');
        }
    };

    const handleTaskStatusChange = async (taskId, newStatus) => {
        try {
            await api.updateTaskStatus(project.id, taskId, newStatus);
            onRefresh();
        } catch (error) {
            showToast('Failed to update status', 'error');
        }
    };

    // Drag and drop for task board
    const handleDragOver = (e) => {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
    };

    const handleDragLeave = (e) => {
        e.currentTarget.classList.remove('drag-over');
    };

    const handleDrop = async (e, newStatus) => {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        const taskId = e.dataTransfer.getData('taskId');
        if (!taskId) return;
        const task = tasks.find(t => t.id === taskId);
        if (!task || task.status === newStatus) return;
        try {
            await api.updateTaskStatus(project.id, taskId, newStatus);
            onRefresh();
        } catch (error) {
            showToast('Failed to update status', 'error');
        }
    };

    const taskColumns = [
        { status: 'todo', title: 'Todo' },
        { status: 'in-progress', title: 'In Progress' },
        { status: 'done', title: 'Done' }
    ];

    const doneCount = tasks.filter(t => t.status === 'done').length;

    return (
        <div className="task-board">
            {/* Project Header */}
            <div className="tb-header">
                <div className="tb-header-left">
                    <button className="btn btn-secondary btn-back" onClick={onBack}>
                        ← Back
                    </button>
                    <div className="tb-project-info">
                        <h1>{project.title}</h1>
                        {project.description && (
                            <p className="tb-project-desc">{project.description}</p>
                        )}
                    </div>
                </div>
                <div className="tb-header-right">
                    <div className="tb-progress">
                        <span className="tb-progress-text">{doneCount}/{tasks.length} tasks</span>
                        {tasks.length > 0 && (
                            <div className="tb-progress-bar">
                                <div className="tb-progress-fill" style={{ width: `${(doneCount / tasks.length) * 100}%` }}></div>
                            </div>
                        )}
                    </div>
                    {onEditProject && (
                        <button className="btn btn-secondary btn-small" onClick={onEditProject} title="Edit project">
                            Edit
                        </button>
                    )}
                    <button className="btn btn-primary btn-small" onClick={() => setShowAddTask(true)}>
                        + Add Task
                    </button>
                </div>
            </div>

            {/* Add Task Form */}
            {showAddTask && (
                <div className="tb-add-task-bar">
                    <input
                        type="text"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="Task title..."
                        className="tb-add-input"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddTask(); if (e.key === 'Escape') setShowAddTask(false); }}
                    />
                    <input
                        type="text"
                        value={newTaskDesc}
                        onChange={(e) => setNewTaskDesc(e.target.value)}
                        placeholder="Description (optional)..."
                        className="tb-add-input tb-add-desc"
                    />
                    <select value={newTaskPriority} onChange={(e) => setNewTaskPriority(e.target.value)} className="tb-add-priority">
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                    </select>
                    <button className="btn btn-primary btn-small" onClick={handleAddTask}>Add</button>
                    <button className="btn btn-secondary btn-small" onClick={() => setShowAddTask(false)}>Cancel</button>
                </div>
            )}

            {/* Task Board Content */}
            <div className="tb-content">
                <div className="tb-columns">
                    {taskColumns.map(col => (
                        <TaskBoardColumn
                            key={col.status}
                            status={col.status}
                            title={col.title}
                            tasks={tasks}
                            onSelect={(task) => { setSelectedTask(task); setRightPanel('task'); }}
                            selectedTaskId={currentSelectedTask?.id}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                        />
                    ))}
                </div>

                {/* Right Sidebar with Tabs */}
                <div className="tb-right-sidebar">
                    <div className="tb-sidebar-tabs">
                        <button
                            className={`tb-sidebar-tab ${rightPanel === 'task' ? 'active' : ''}`}
                            onClick={() => setRightPanel('task')}
                        >Task</button>
                        <button
                            className={`tb-sidebar-tab ${rightPanel === 'cursor' ? 'active' : ''}`}
                            onClick={() => setRightPanel('cursor')}
                        >Cursor</button>
                        <button
                            className={`tb-sidebar-tab ${rightPanel === 'docs' ? 'active' : ''}`}
                            onClick={() => setRightPanel('docs')}
                        >Docs</button>
                    </div>

                    {rightPanel === 'task' && (
                        <TaskDetailPanel
                            task={currentSelectedTask}
                            project={project}
                            onClose={() => setSelectedTask(null)}
                            onRefresh={onRefresh}
                            showToast={showToast}
                        />
                    )}
                    {rightPanel === 'cursor' && (
                        <CursorPanel
                            project={project}
                            onRefresh={onRefresh}
                            showToast={showToast}
                        />
                    )}
                    {rightPanel === 'docs' && (
                        <DocsPanel project={project} onRefresh={onRefresh} />
                    )}
                </div>
            </div>
        </div>
    );
};

// Project Card Component
const ProjectCard = ({ project, projects, onDragStart, onDragEnd, onClick, onStatusChange }) => {
    const [expanded, setExpanded] = useState(false);

    const blockedByProjects = (project.blockedBy || [])
        .map(id => projects.find(p => p.id === id))
        .filter(Boolean);

    const blocksProjects = (project.blocks || [])
        .map(id => projects.find(p => p.id === id))
        .filter(Boolean);

    const hasUnfinishedDependencies = blockedByProjects.some(p => p.status !== 'done');
    const stepCount = (project.workLog || []).length;
    const unansweredQuestions = (project.claudeQuestions || []).filter(q => !q.answered).length;

    // Active tasks: exclude done
    const activeTasks = (project.tasks || []).filter(t => t.status !== 'done');

    const getTaskDotClass = (task) => {
        if (task.assignedTo && (task.claudeStatus === 'needs-info' || task.claudeStatus === 'blocked')) {
            return 'task-dot-needs-work';
        }
        if (task.status === 'in-progress') return 'task-dot-in-progress';
        return 'task-dot-todo';
    };

    return (
        <div
            className={`project-card ${hasUnfinishedDependencies ? 'has-blockers' : ''} ${project.assignedTo === 'claude' ? 'assigned-claude' : ''} ${project.status === 'cancelled' ? 'project-cancelled' : ''}`}
            draggable
            onDragStart={(e) => onDragStart(e, project.id)}
            onDragEnd={onDragEnd}
            data-id={project.id}
        >
            <div className="card-header">
                <span className="card-title" onClick={() => onClick(project)}>
                    {project.title}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <span className={`priority-indicator priority-${project.priority || 'medium'}`}></span>
                </div>
            </div>

            {/* Assignment Status */}
            {project.assignedTo === 'claude' && (
                <div className="claude-assignment">
                    <ClaudeStatusBadge status={project.claudeStatus} />
                    {unansweredQuestions > 0 && (
                        <span className="questions-badge">{unansweredQuestions} question{unansweredQuestions > 1 ? 's' : ''}</span>
                    )}
                </div>
            )}

            {project.description && (
                <p className="card-description">{project.description}</p>
            )}

            {/* Cancel Reason */}
            {project.status === 'cancelled' && project.cancelReason && (
                <div className="card-cancel-reason">
                    <span className="cancel-label">Reason:</span> {project.cancelReason}
                </div>
            )}

            {/* Questions Preview */}
            {unansweredQuestions > 0 && (
                <div className="claude-questions-preview">
                    <span className="questions-label">❓ Cursor asks:</span>
                    <p className="question-preview">
                        {project.claudeQuestions.find(q => !q.answered)?.question}
                    </p>
                </div>
            )}

            {/* Dependencies Section */}
            {blockedByProjects.length > 0 && (
                <div className="card-dependencies">
                    <span className="dep-label">Blocked by:</span>
                    {blockedByProjects.map(dep => (
                        <span key={dep.id} className={`dep-tag ${dep.status === 'done' ? 'done' : 'pending'}`}>
                            {dep.status === 'done' ? '✓' : '⏳'} {dep.title}
                        </span>
                    ))}
                </div>
            )}

            {blocksProjects.length > 0 && (
                <div className="card-dependencies blocks">
                    <span className="dep-label">Blocks:</span>
                    {blocksProjects.map(dep => (
                        <span key={dep.id} className="dep-tag blocking">
                            {dep.title}
                        </span>
                    ))}
                </div>
            )}

            {/* Expandable Task Preview */}
            {activeTasks.length > 0 && (
                <div className="card-task-dropdown-wrapper">
                    <button
                        className="card-expand-btn"
                        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                    >
                        <span className="card-expand-chevron">{expanded ? '▾' : '▸'}</span>
                        <span>{activeTasks.length} task{activeTasks.length !== 1 ? 's' : ''}</span>
                    </button>
                    {expanded && (
                        <div className="card-task-dropdown" onClick={(e) => e.stopPropagation()}>
                            {activeTasks.map(task => (
                                <div key={task.id} className="card-task-row">
                                    <span className={`task-dot ${getTaskDotClass(task)}`}></span>
                                    <span className="card-task-title">{task.title}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="card-footer">
                <div className="card-tags">
                    {(project.tags || []).slice(0, 2).map((tag, i) => (
                        <span key={i} className="tag">{tag}</span>
                    ))}
                    {(project.tags || []).length > 2 && (
                        <span className="tag">+{project.tags.length - 2}</span>
                    )}
                </div>
                <div className="card-meta">
                    {stepCount > 0 && <span className="step-count">{stepCount} steps</span>}
                    {project.dueDate && (
                        <span className={`card-due ${getDueDateClass(project.dueDate)}`}>
                            {formatDate(project.dueDate)}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

// Kanban Column Component
const KanbanColumn = ({ status, title, projects, allProjects, onDrop, onDragOver, onDragLeave, onCardClick, onDragStart, onDragEnd }) => {
    const columnProjects = projects.filter(p => p.status === status);

    return (
        <div className="kanban-column" data-status={status}>
            <div className="column-header">
                <h2>{title}</h2>
                <span className="task-count">{columnProjects.length}</span>
            </div>
            <div
                className="column-content"
                onDrop={(e) => onDrop(e, status)}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
            >
                {columnProjects.map(project => (
                    <ProjectCard
                        key={project.id}
                        project={project}
                        projects={allProjects}
                        onDragStart={onDragStart}
                        onDragEnd={onDragEnd}
                        onClick={onCardClick}
                    />
                ))}
            </div>
        </div>
    );
};

// Clickable Work Log Entry Component
const WorkLogEntry = ({ entry, projectId, onDelete, onUpdate, isExpanded, onToggle }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({
        content: entry.content || '',
        details: entry.details || '',
        outcome: entry.outcome || '',
        files: (entry.files || []).join(', '),
        links: (entry.links || []).join(', ')
    });

    const handleSave = async () => {
        await onUpdate(projectId, entry.id, {
            ...editData,
            files: editData.files ? editData.files.split(',').map(f => f.trim()).filter(f => f) : [],
            links: editData.links ? editData.links.split(',').map(l => l.trim()).filter(l => l) : []
        });
        setIsEditing(false);
    };

    const hasDetails = entry.details || entry.outcome || entry.files?.length || entry.links?.length || entry.codeSnippet;

    return (
        <div className={`log-entry ${entry.type} ${isExpanded ? 'expanded' : ''}`}>
            <button className="log-entry-delete" onClick={() => onDelete(projectId, entry.id)}>×</button>

            <div className="log-entry-header" onClick={onToggle} style={{ cursor: 'pointer' }}>
                <span className="log-entry-type">
                    {entry.type}
                    {hasDetails && <span className="has-details-indicator"> •</span>}
                </span>
                <span className="log-entry-time">
                    {formatDateTime(entry.timestamp)}
                    {entry.author && entry.author !== 'Claude' && entry.author !== 'Cursor' && ` by ${entry.author}`}
                </span>
            </div>

            <div className="log-entry-content" onClick={onToggle} style={{ cursor: 'pointer' }}>
                {entry.content}
                {!isExpanded && hasDetails && <span className="expand-hint"> (click for details)</span>}
            </div>

            {isExpanded && (
                <div className="log-entry-details">
                    {isEditing ? (
                        <div className="entry-edit-form">
                            <div className="edit-field">
                                <label>Content:</label>
                                <textarea
                                    value={editData.content}
                                    onChange={(e) => setEditData({...editData, content: e.target.value})}
                                    rows={2}
                                />
                            </div>
                            <div className="edit-field">
                                <label>Details/Notes:</label>
                                <textarea
                                    value={editData.details}
                                    onChange={(e) => setEditData({...editData, details: e.target.value})}
                                    rows={3}
                                    placeholder="Additional details, context, or explanation..."
                                />
                            </div>
                            <div className="edit-field">
                                <label>Outcome/Result:</label>
                                <input
                                    type="text"
                                    value={editData.outcome}
                                    onChange={(e) => setEditData({...editData, outcome: e.target.value})}
                                    placeholder="What was the result?"
                                />
                            </div>
                            <div className="edit-field">
                                <label>Related Files (comma-separated):</label>
                                <input
                                    type="text"
                                    value={editData.files}
                                    onChange={(e) => setEditData({...editData, files: e.target.value})}
                                    placeholder="path/to/file.py, another/file.js"
                                />
                            </div>
                            <div className="edit-field">
                                <label>Related Links (comma-separated):</label>
                                <input
                                    type="text"
                                    value={editData.links}
                                    onChange={(e) => setEditData({...editData, links: e.target.value})}
                                    placeholder="https://example.com, https://docs.com"
                                />
                            </div>
                            <div className="edit-actions">
                                <button className="btn btn-small btn-primary" onClick={handleSave}>Save</button>
                                <button className="btn btn-small btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {entry.details && (
                                <div className="detail-section">
                                    <span className="detail-label">Details:</span>
                                    <p>{entry.details}</p>
                                </div>
                            )}
                            {entry.outcome && (
                                <div className="detail-section">
                                    <span className="detail-label">Outcome:</span>
                                    <p className="outcome-text">{entry.outcome}</p>
                                </div>
                            )}
                            {entry.files?.length > 0 && (
                                <div className="detail-section">
                                    <span className="detail-label">Files:</span>
                                    <div className="file-list">
                                        {entry.files.map((file, i) => (
                                            <code key={i} className="file-path">{file}</code>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {entry.links?.length > 0 && (
                                <div className="detail-section">
                                    <span className="detail-label">Links:</span>
                                    <div className="link-list">
                                        {entry.links.map((link, i) => (
                                            <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="entry-link">
                                                {link}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {entry.codeSnippet && (
                                <div className="detail-section">
                                    <span className="detail-label">Code:</span>
                                    <pre className="code-snippet">{entry.codeSnippet}</pre>
                                </div>
                            )}
                            {entry.duration && (
                                <div className="detail-section inline">
                                    <span className="detail-label">Duration:</span>
                                    <span>{entry.duration}</span>
                                </div>
                            )}
                            <button className="btn btn-small edit-entry-btn" onClick={() => setIsEditing(true)}>
                                Edit Details
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

// Markdown renderer with sanitization
const renderMarkdown = (text) => {
    if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
        try {
            return DOMPurify.sanitize(marked.parse(text));
        } catch (e) {
            // fallback below
        }
    }
    // Escape HTML as fallback
    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return escaped.replace(/\n/g, '<br/>');
};

// Chat Panel Component (Ollama)
const ChatPanel = ({ projects, defaultProjectId }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedProjectId, setSelectedProjectId] = useState(defaultProjectId || '');
    const [model, setModel] = useState('');
    const [models, setModels] = useState([]);
    const [error, setError] = useState(null);
    const [ollamaHealthy, setOllamaHealthy] = useState(true);

    const messagesRef = useRef(null);
    const contentRef = useRef('');
    const rafRef = useRef(null);
    const abortRef = useRef(null);
    const autoScrollRef = useRef(true);

    // Load models on mount
    useEffect(() => {
        fetch(`${API_BASE}/chat/models`)
            .then(r => r.json())
            .then(data => {
                const modelList = data.models || [];
                setModels(modelList);
                if (modelList.length > 0 && !model) {
                    setModel(modelList[0].name);
                }
            })
            .catch(() => {});
    }, []);

    // Health check on mount
    useEffect(() => {
        fetch(`${API_BASE}/chat/health`)
            .then(r => r.json())
            .then(data => setOllamaHealthy(data.healthy))
            .catch(() => setOllamaHealthy(false));
    }, []);

    // Smart auto-scroll: only scroll if user is near bottom
    const handleScroll = () => {
        const el = messagesRef.current;
        if (!el) return;
        const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        autoScrollRef.current = atBottom;
    };

    useEffect(() => {
        if (autoScrollRef.current && messagesRef.current) {
            messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
        }
    }, [messages]);

    const handleAbort = () => {
        if (abortRef.current) {
            abortRef.current.abort();
            abortRef.current = null;
        }
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        setError(null);
        const now = new Date();
        const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const userMessage = { role: 'user', content: input.trim(), timestamp };
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setInput('');
        setIsLoading(true);
        autoScrollRef.current = true;

        const controller = new AbortController();
        abortRef.current = controller;

        try {
            const response = await fetch(`${API_BASE}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: model || 'llama3.2',
                    messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
                    projectId: selectedProjectId || undefined
                }),
                signal: controller.signal
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `HTTP ${response.status}`);
            }

            setOllamaHealthy(true);
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            contentRef.current = '';
            let lineBuffer = '';
            const assistantTs = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            setMessages(prev => [...prev, { role: 'assistant', content: '', timestamp: assistantTs }]);

            const scheduleUpdate = () => {
                if (rafRef.current) return;
                rafRef.current = requestAnimationFrame(() => {
                    rafRef.current = null;
                    const snap = contentRef.current;
                    setMessages(prev => {
                        const updated = [...prev];
                        updated[updated.length - 1] = { role: 'assistant', content: snap, timestamp: assistantTs };
                        return updated;
                    });
                });
            };

            let cancelled = false;
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    lineBuffer += decoder.decode(value, { stream: true });
                    const lines = lineBuffer.split('\n');
                    lineBuffer = lines.pop(); // keep incomplete line in buffer

                    for (const line of lines) {
                        if (!line.trim()) continue;
                        try {
                            const data = JSON.parse(line);
                            if (data.error) {
                                contentRef.current = data.error;
                            } else if (data.message?.content) {
                                contentRef.current += data.message.content;
                            }
                            scheduleUpdate();
                        } catch (parseErr) {
                            // Incomplete JSON - skip this line
                        }
                    }
                }
            } catch (readErr) {
                if (readErr.name === 'AbortError') {
                    cancelled = true;
                } else {
                    throw readErr;
                }
            }

            // Process any remaining buffer
            if (lineBuffer.trim()) {
                try {
                    const data = JSON.parse(lineBuffer);
                    if (data.error) {
                        contentRef.current = data.error;
                    } else if (data.message?.content) {
                        contentRef.current += data.message.content;
                    }
                } catch (e) {}
            }

            // Final state update
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
            const finalContent = contentRef.current + (cancelled ? '\n\n*(generation cancelled)*' : '');
            setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: finalContent, timestamp: assistantTs };
                return updated;
            });

        } catch (err) {
            if (err.name === 'AbortError') {
                // Already handled above
            } else {
                setOllamaHealthy(false);
                setError(err.message);
                // Remove empty assistant message if one was added
                setMessages(prev => {
                    if (prev.length > 0 && prev[prev.length - 1].role === 'assistant' && !prev[prev.length - 1].content) {
                        return prev.slice(0, -1);
                    }
                    return prev;
                });
            }
        }

        abortRef.current = null;
        setIsLoading(false);
    };

    const handleRetry = () => {
        setError(null);
        // Re-check health
        fetch(`${API_BASE}/chat/health`)
            .then(r => r.json())
            .then(data => setOllamaHealthy(data.healthy))
            .catch(() => setOllamaHealthy(false));
    };

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text).catch(() => {});
    };

    return (
        <div className={`chat-panel ${defaultProjectId ? 'chat-panel-embedded' : ''}`}>
            <div className="chat-header">
                <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                    <h2>AI Chat</h2>
                    {!ollamaHealthy && <span className="chat-health-badge chat-health-down">Offline</span>}
                </div>
                <button className="btn btn-small" onClick={() => { setMessages([]); setError(null); }}>Clear</button>
            </div>

            <div className="chat-config">
                <select value={model} onChange={e => setModel(e.target.value)} className="chat-select">
                    {models.length > 0 ? (
                        models.map(m => <option key={m.name} value={m.name}>{m.name.split(':')[0]}</option>)
                    ) : (
                        <option value="">No models found</option>
                    )}
                </select>
                {!defaultProjectId && (
                    <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} className="chat-select">
                        <option value="">No project context</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.title}</option>
                        ))}
                    </select>
                )}
            </div>

            {error && (
                <div className="chat-error-banner">
                    <span>{error}</span>
                    <div style={{display: 'flex', gap: '0.5rem'}}>
                        <button className="btn btn-small" onClick={handleRetry}>Retry</button>
                        <button className="btn btn-small" onClick={() => setError(null)}>Dismiss</button>
                    </div>
                </div>
            )}

            <div className="chat-messages" ref={messagesRef} onScroll={handleScroll}>
                {messages.length === 0 ? (
                    <div className="empty-state">
                        <p>Start a conversation with your AI assistant.</p>
                        <p style={{fontSize: '0.75rem', marginTop: '0.5rem'}}>Select a project for context, or just chat freely.</p>
                    </div>
                ) : (
                    messages.map((msg, i) => (
                        <div key={i} className={`chat-message chat-${msg.role}`}>
                            <div className="chat-message-header">
                                <span className="chat-role">{msg.role === 'user' ? 'You' : 'AI'}</span>
                                {msg.timestamp && <span className="chat-timestamp">{msg.timestamp}</span>}
                                {msg.role === 'assistant' && msg.content && (
                                    <button className="chat-copy-btn" onClick={() => handleCopy(msg.content)} title="Copy">Copy</button>
                                )}
                            </div>
                            {msg.role === 'assistant' ? (
                                <div className="chat-content chat-markdown"
                                     dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content || '') }} />
                            ) : (
                                <div className="chat-content">{msg.content}</div>
                            )}
                        </div>
                    ))
                )}
                {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && !messages[messages.length - 1].content && (
                    <div className="chat-typing-indicator"><span /><span /><span /></div>
                )}
            </div>

            <div className="chat-input-area">
                <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Ask anything... (Ctrl+Enter to send)"
                    rows={2}
                    onKeyDown={e => {
                        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                    disabled={isLoading}
                />
                <div className="chat-input-actions">
                    {isLoading ? (
                        <button className="btn btn-small" onClick={handleAbort}>Stop</button>
                    ) : (
                        <button className="btn btn-primary" onClick={handleSend} disabled={!input.trim()}>
                            Send
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// Cursor Crawler Modal — scan all projects and batch-assign tasks
const CrawlerModal = ({ isOpen, onClose, projects, onRefresh, showToast }) => {
    const [selected, setSelected] = useState(new Set());
    const [suggested, setSuggested] = useState(new Set());
    const [suggesting, setSuggesting] = useState(false);
    const [running, setRunning] = useState(false);
    const [progress, setProgress] = useState(null); // { done, total, current }

    // All candidate tasks: unassigned, not done, project has codeDir
    const candidates = [];
    for (const proj of projects) {
        if (!proj.codeDir) continue;
        for (const task of proj.tasks || []) {
            if (task.assignedTo || task.status === 'done') continue;
            candidates.push({ proj, task });
        }
    }

    // Group by project for display
    const byProject = {};
    for (const { proj, task } of candidates) {
        if (!byProject[proj.id]) byProject[proj.id] = { proj, tasks: [] };
        byProject[proj.id].tasks.push(task);
    }

    const toggle = (taskId) => setSelected(prev => {
        const next = new Set(prev);
        next.has(taskId) ? next.delete(taskId) : next.add(taskId);
        return next;
    });

    const selectAll = () => setSelected(new Set(candidates.map(c => c.task.id)));
    const selectNone = () => setSelected(new Set());
    const selectSuggested = () => setSelected(new Set(suggested));

    const handleSuggest = async () => {
        setSuggesting(true);
        try {
            const res = await fetch(`${API_BASE}/cursor/suggest-tasks`, { method: 'POST' });
            const data = await res.json();
            if (data.error) { showToast(data.error, 'error'); return; }
            const ids = new Set(data.suggested || []);
            setSuggested(ids);
            setSelected(ids);
            showToast(`AI suggested ${ids.size} tasks`);
        } catch (e) {
            showToast('Failed to get suggestions', 'error');
        } finally {
            setSuggesting(false);
        }
    };

    const handleRun = async () => {
        const toRun = candidates.filter(c => selected.has(c.task.id));
        if (!toRun.length) return;
        setRunning(true);
        setProgress({ done: 0, total: toRun.length, current: null });

        for (let i = 0; i < toRun.length; i++) {
            const { proj, task } = toRun[i];
            setProgress({ done: i, total: toRun.length, current: task.title });
            try {
                await api.assignTaskToCursor(proj.id, task.id, '', [], '');
                // Small delay to avoid hammering the backend
                await new Promise(r => setTimeout(r, 800));
            } catch (e) {
                showToast(`Failed: ${task.title}`, 'error');
            }
        }

        setProgress({ done: toRun.length, total: toRun.length, current: null });
        setRunning(false);
        showToast(`Queued ${toRun.length} tasks for Cursor`);
        onRefresh();
        setTimeout(onClose, 1200);
    };

    if (!isOpen) return null;

    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

    return (
        <div className="modal active" onClick={onClose}>
            <div className="modal-content crawler-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>🕷️ Cursor Crawler</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="crawler-toolbar">
                    <div className="crawler-counts">
                        <span>{candidates.length} eligible tasks across {Object.keys(byProject).length} projects</span>
                        <span className="crawler-selected-count">{selected.size} selected</span>
                    </div>
                    <div className="crawler-actions">
                        <button className="btn btn-small btn-secondary" onClick={selectAll}>Select All</button>
                        <button className="btn btn-small btn-secondary" onClick={selectNone}>Clear</button>
                        {suggested.size > 0 && (
                            <button className="btn btn-small btn-secondary" onClick={selectSuggested}>
                                AI Pick ({suggested.size})
                            </button>
                        )}
                        <button
                            className="btn btn-small btn-primary"
                            onClick={handleSuggest}
                            disabled={suggesting}
                        >
                            {suggesting ? '⏳ Analysing...' : '✨ AI Suggest'}
                        </button>
                        <button
                            className="btn btn-small btn-cursor crawler-run-btn"
                            onClick={handleRun}
                            disabled={running || selected.size === 0}
                        >
                            {running ? `Running ${progress?.done}/${progress?.total}...` : `⚡ Run ${selected.size} Selected`}
                        </button>
                    </div>
                </div>

                {progress && running && (
                    <div className="crawler-progress">
                        <div className="crawler-progress-bar">
                            <div
                                className="crawler-progress-fill"
                                style={{ width: `${(progress.done / progress.total) * 100}%` }}
                            />
                        </div>
                        {progress.current && <span className="crawler-progress-label">Running: {progress.current}</span>}
                    </div>
                )}

                <div className="crawler-body">
                    {candidates.length === 0 ? (
                        <div className="crawler-empty">
                            <p>No eligible tasks found.</p>
                            <p className="empty-text">Tasks need a project with Code Dir set, and must be unassigned and not done.</p>
                        </div>
                    ) : Object.values(byProject).map(({ proj, tasks }) => (
                        <div key={proj.id} className="crawler-project">
                            <div className="crawler-project-header">
                                <span className="crawler-project-name">{proj.title}</span>
                                <span className="crawler-project-dir">{proj.codeDir}</span>
                                <button
                                    className="btn btn-tiny btn-secondary"
                                    onClick={() => {
                                        const ids = tasks.map(t => t.id);
                                        const allSelected = ids.every(id => selected.has(id));
                                        setSelected(prev => {
                                            const next = new Set(prev);
                                            ids.forEach(id => allSelected ? next.delete(id) : next.add(id));
                                            return next;
                                        });
                                    }}
                                >
                                    {tasks.every(t => selected.has(t.id)) ? 'Deselect all' : 'Select all'}
                                </button>
                            </div>
                            <div className="crawler-task-list">
                                {[...tasks].sort((a, b) => (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2)).map(task => (
                                    <label key={task.id} className={`crawler-task ${selected.has(task.id) ? 'selected' : ''} ${suggested.has(task.id) ? 'suggested' : ''}`}>
                                        <input
                                            type="checkbox"
                                            checked={selected.has(task.id)}
                                            onChange={() => toggle(task.id)}
                                        />
                                        <span className={`priority-dot priority-${task.priority || 'medium'}`}></span>
                                        <span className="crawler-task-title">{task.title}</span>
                                        {task.description && (
                                            <span className="crawler-task-desc">{task.description.slice(0, 80)}{task.description.length > 80 ? '…' : ''}</span>
                                        )}
                                        {suggested.has(task.id) && <span className="crawler-ai-badge">✨ AI pick</span>}
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// All Tasks Modal — every task across all projects, grouped by status
const AllTasksModal = ({ isOpen, onClose, projects, onRefresh, showToast }) => {
    const [selectedTaskId, setSelectedTaskId] = useState(null);
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const [filterGroup, setFilterGroup] = useState('all');
    const [search, setSearch] = useState('');

    // Flatten all tasks with their project
    const allTasks = [];
    for (const proj of projects) {
        for (const task of proj.tasks || []) {
            allTasks.push({ task, proj });
        }
    }

    const getGroup = ({ task }) => {
        if (task.assignedTo === 'cursor' && task.claudeStatus === 'review') return 'review';
        if (task.assignedTo === 'cursor') return 'working';
        if (task.status === 'done') return 'done';
        return 'todo';
    };

    const groups = [
        { key: 'review',  label: '👀 Review',  color: '#fbbf24' },
        { key: 'working', label: '⚡ Working', color: 'var(--primary-light)' },
        { key: 'todo',    label: '○ Todo',     color: 'var(--text-secondary)' },
        { key: 'done',    label: '● Done',     color: '#4ade80' },
    ];

    const searchLower = search.toLowerCase();
    const filtered = allTasks.filter(({ task, proj }) => {
        if (filterGroup !== 'all' && getGroup({ task }) !== filterGroup) return false;
        if (search && !task.title.toLowerCase().includes(searchLower) && !proj.title.toLowerCase().includes(searchLower)) return false;
        return true;
    });

    const counts = {};
    for (const g of groups) counts[g.key] = allTasks.filter(x => getGroup(x) === g.key).length;

    // Find selected task + project for detail panel
    const selectedProj = projects.find(p => p.id === selectedProjectId);
    const selectedTask = selectedProj?.tasks?.find(t => t.id === selectedTaskId) || null;

    if (!isOpen) return null;

    return (
        <div className="modal active" onClick={onClose}>
            <div className="all-tasks-modal" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="all-tasks-header">
                    <h2>All Tasks</h2>
                    <div className="all-tasks-filters">
                        <input
                            className="all-tasks-search"
                            placeholder="Search tasks or projects..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                        <div className="all-tasks-tabs">
                            <button
                                className={`all-tasks-tab ${filterGroup === 'all' ? 'active' : ''}`}
                                onClick={() => setFilterGroup('all')}
                            >All <span>{allTasks.length}</span></button>
                            {groups.map(g => (
                                <button
                                    key={g.key}
                                    className={`all-tasks-tab ${filterGroup === g.key ? 'active' : ''}`}
                                    style={filterGroup === g.key ? { color: g.color } : {}}
                                    onClick={() => setFilterGroup(g.key)}
                                >{g.label} <span>{counts[g.key]}</span></button>
                            ))}
                        </div>
                    </div>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="all-tasks-body">
                    {/* Task list */}
                    <div className="all-tasks-list">
                        {filtered.length === 0 && (
                            <p className="empty-text" style={{ padding: '2rem', textAlign: 'center' }}>No tasks found.</p>
                        )}
                        {(filterGroup === 'all' ? groups : groups.filter(g => g.key === filterGroup)).map(g => {
                            const groupItems = filtered.filter(x => getGroup(x) === g.key);
                            if (!groupItems.length) return null;
                            return (
                                <div key={g.key}>
                                    <div className={`task-group-header task-group-${g.key}`} style={{ margin: '0.5rem 0.75rem 0.25rem' }}>
                                        {g.label}
                                        <span className="task-group-count">{groupItems.length}</span>
                                    </div>
                                    {groupItems.map(({ task, proj }) => (
                                        <div
                                            key={task.id}
                                            className={`all-tasks-row ${selectedTaskId === task.id ? 'active' : ''}`}
                                            onClick={() => { setSelectedTaskId(task.id); setSelectedProjectId(proj.id); }}
                                        >
                                            <span className={`priority-dot priority-${task.priority || 'medium'}`} />
                                            <span className="all-tasks-row-title">{task.title}</span>
                                            <span className="all-tasks-row-project">{proj.title}</span>
                                            {task.assignedTo === 'cursor' && (
                                                <span className={`cursor-run-dot ${task.claudeStatus === 'review' ? 'review' : task.claudeStatus === 'working' || task.claudeStatus === 'pending' ? 'running' : 'stopped'}`} />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>

                    {/* Detail panel */}
                    <div className="all-tasks-detail">
                        {selectedTask && selectedProj ? (
                            <TaskDetailPanel
                                task={selectedTask}
                                project={selectedProj}
                                onClose={() => setSelectedTaskId(null)}
                                onRefresh={onRefresh}
                                showToast={showToast}
                            />
                        ) : (
                            <div className="all-tasks-detail-empty">
                                <p>Select a task to view details and take action.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Project Modal Component
const ProjectModal = ({ isOpen, project, projects, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'medium',
        dueDate: '',
        tags: '',
        blockedBy: [],
        githubRepo: ''
    });

    useEffect(() => {
        if (project) {
            setFormData({
                title: project.title || '',
                description: project.description || '',
                priority: project.priority || 'medium',
                dueDate: project.dueDate || '',
                tags: (project.tags || []).join(', '),
                blockedBy: project.blockedBy || [],
                githubRepo: project.githubRepo || ''
            });
        } else {
            setFormData({
                title: '',
                description: '',
                priority: 'medium',
                dueDate: '',
                tags: '',
                blockedBy: [],
                githubRepo: ''
            });
        }
    }, [project, isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const tags = formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(t => t) : [];
        onSave({
            ...formData,
            tags,
            id: project?.id
        });
    };

    const toggleDependency = (depId) => {
        setFormData(prev => ({
            ...prev,
            blockedBy: prev.blockedBy.includes(depId)
                ? prev.blockedBy.filter(id => id !== depId)
                : [...prev.blockedBy, depId]
        }));
    };

    const availableProjects = projects.filter(p => p.id !== project?.id);

    if (!isOpen) return null;

    return (
        <div className="modal active" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{project ? 'Edit Project' : 'New Project'}</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Title *</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                            required
                            placeholder="Project title..."
                        />
                    </div>
                    <div className="form-group">
                        <label>Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                            rows={3}
                            placeholder="Brief description..."
                        />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Priority</label>
                            <select
                                value={formData.priority}
                                onChange={(e) => setFormData({...formData, priority: e.target.value})}
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="critical">Critical</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Due Date</label>
                            <input
                                type="date"
                                value={formData.dueDate}
                                onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Tags (comma-separated)</label>
                        <input
                            type="text"
                            value={formData.tags}
                            onChange={(e) => setFormData({...formData, tags: e.target.value})}
                            placeholder="e.g., frontend, urgent"
                        />
                    </div>
                    <div className="form-group">
                        <label>GitHub repo (for Cursor Cloud Agents)</label>
                        <input
                            type="text"
                            value={formData.githubRepo}
                            onChange={(e) => setFormData({...formData, githubRepo: e.target.value})}
                            placeholder="https://github.com/owner/repo or owner/repo"
                        />
                    </div>

                    {/* Dependencies Section */}
                    {availableProjects.length > 0 && (
                        <div className="form-group">
                            <label>Blocked By (Dependencies)</label>
                            <div className="dependency-selector">
                                {availableProjects.map(p => (
                                    <label key={p.id} className="dep-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={formData.blockedBy.includes(p.id)}
                                            onChange={() => toggleDependency(p.id)}
                                        />
                                        <span className={`dep-status ${p.status}`}>
                                            {p.status === 'done' ? '✓' : '○'}
                                        </span>
                                        {p.title}
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Project Detail Modal
const DetailModal = ({ project, projects, isOpen, onClose, onEdit, onDelete, onAddDependency, onRemoveDependency, onAssignClaude, onUnassignClaude, onAnswerQuestion, onRefresh, showToast, onClaudeReview }) => {
    const [showDepSelector, setShowDepSelector] = useState(false);
    const [showClaudeAssign, setShowClaudeAssign] = useState(false);
    const [claudeInstructions, setClaudeInstructions] = useState('');
    const [answeringQuestionId, setAnsweringQuestionId] = useState(null);
    const [questionAnswer, setQuestionAnswer] = useState('');

    if (!isOpen || !project) return null;

    const blockedByProjects = (project.blockedBy || [])
        .map(id => projects.find(p => p.id === id))
        .filter(Boolean);

    const blocksProjects = (project.blocks || [])
        .map(id => projects.find(p => p.id === id))
        .filter(Boolean);

    const availableForDep = projects.filter(p =>
        p.id !== project.id &&
        !project.blockedBy?.includes(p.id)
    );

    return (
        <div className="modal active" onClick={onClose}>
            <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{project.title}</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>
                <div className="detail-content">
                    <div className="detail-main">
                        <div className="detail-section">
                            <h3>Description</h3>
                            <p>{project.description || 'No description'}</p>
                        </div>

                        {/* Tasks Section */}
                        <div className="detail-section">
                            <h3>Tasks</h3>
                            <TaskList
                                project={project}
                                onRefresh={onRefresh}
                                showToast={showToast || (() => {})}
                            />
                        </div>

                        {/* Dependencies Section */}
                        <div className="detail-section">
                            <h3>Dependencies</h3>

                            {blockedByProjects.length > 0 && (
                                <div className="dep-list">
                                    <h4>Blocked By:</h4>
                                    {blockedByProjects.map(dep => (
                                        <div key={dep.id} className={`dep-item ${dep.status === 'done' ? 'done' : 'pending'}`}>
                                            <span className="dep-status-icon">
                                                {dep.status === 'done' ? '✓' : '⏳'}
                                            </span>
                                            <span className="dep-title">{dep.title}</span>
                                            <span className={`dep-status-badge ${dep.status}`}>
                                                {formatStatus(dep.status)}
                                            </span>
                                            <button
                                                className="dep-remove"
                                                onClick={() => onRemoveDependency(project.id, dep.id)}
                                            >×</button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {blocksProjects.length > 0 && (
                                <div className="dep-list blocks">
                                    <h4>Blocks:</h4>
                                    {blocksProjects.map(dep => (
                                        <div key={dep.id} className="dep-item blocking">
                                            <span className="dep-title">{dep.title}</span>
                                            <span className={`dep-status-badge ${dep.status}`}>
                                                {formatStatus(dep.status)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button
                                className="btn btn-small btn-add-dep"
                                onClick={() => setShowDepSelector(!showDepSelector)}
                            >
                                + Add Dependency
                            </button>

                            {showDepSelector && availableForDep.length > 0 && (
                                <div className="dep-selector-dropdown">
                                    {availableForDep.map(p => (
                                        <div
                                            key={p.id}
                                            className="dep-selector-item"
                                            onClick={() => {
                                                onAddDependency(project.id, p.id);
                                                setShowDepSelector(false);
                                            }}
                                        >
                                            {p.title} ({formatStatus(p.status)})
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Assignment Section */}
                        <div className="detail-section claude-section">
                            <h3>🔧 Cursor Assignment</h3>

                            {project.assignedTo === 'claude' ? (
                                <div className="claude-assigned-info">
                                    <div className="claude-status-row">
                                        <span className="label">Status:</span>
                                        <ClaudeStatusBadge status={project.claudeStatus} />
                                    </div>

                                    {project.claudeInstructions && (
                                        <div className="claude-instructions-display">
                                            <span className="label">Instructions:</span>
                                            <p>{project.claudeInstructions}</p>
                                        </div>
                                    )}

                                    {/* Unanswered Questions */}
                                    {(project.claudeQuestions || []).filter(q => !q.answered).length > 0 && (
                                        <div className="claude-questions">
                                            <h4>❓ Cursor's Questions</h4>
                                            {project.claudeQuestions.filter(q => !q.answered).map(q => (
                                                <div key={q.id} className="question-card">
                                                    <p className="question-text">{q.question}</p>
                                                    {q.context && <p className="question-context">{q.context}</p>}
                                                    <span className="question-time">{formatDateTime(q.timestamp)}</span>

                                                    {answeringQuestionId === q.id ? (
                                                        <div className="answer-form">
                                                            <textarea
                                                                value={questionAnswer}
                                                                onChange={(e) => setQuestionAnswer(e.target.value)}
                                                                placeholder="Type your answer..."
                                                                rows={3}
                                                            />
                                                            <div className="answer-actions">
                                                                <button
                                                                    className="btn btn-primary btn-small"
                                                                    onClick={async () => {
                                                                        if (questionAnswer.trim()) {
                                                                            await onAnswerQuestion(project.id, q.id, questionAnswer);
                                                                            setAnsweringQuestionId(null);
                                                                            setQuestionAnswer('');
                                                                            onRefresh();
                                                                        }
                                                                    }}
                                                                >
                                                                    Submit Answer
                                                                </button>
                                                                <button
                                                                    className="btn btn-secondary btn-small"
                                                                    onClick={() => {
                                                                        setAnsweringQuestionId(null);
                                                                        setQuestionAnswer('');
                                                                    }}
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            className="btn btn-primary btn-small"
                                                            onClick={() => setAnsweringQuestionId(q.id)}
                                                        >
                                                            Answer
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Answered Questions */}
                                    {(project.claudeQuestions || []).filter(q => q.answered).length > 0 && (
                                        <div className="claude-questions answered">
                                            <h4>✓ Answered Questions</h4>
                                            {project.claudeQuestions.filter(q => q.answered).map(q => (
                                                <div key={q.id} className="question-card answered">
                                                    <p className="question-text">{q.question}</p>
                                                    <p className="answer-text">→ {q.answer}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <button
                                        className="btn btn-secondary btn-unassign"
                                        onClick={async () => {
                                            if (confirm('Unassign this project?')) {
                                                await onUnassignClaude(project.id);
                                                onRefresh();
                                            }
                                        }}
                                    >
                                        Unassign
                                    </button>
                                </div>
                            ) : (
                                <div className="claude-assign-form">
                                    {!showClaudeAssign ? (
                                        <button
                                            className="btn btn-cursor"
                                            onClick={() => setShowClaudeAssign(true)}
                                        >
                                            🔧 Send to Cursor
                                        </button>
                                    ) : (
                                        <div className="assign-form">
                                            <textarea
                                                value={claudeInstructions}
                                                onChange={(e) => setClaudeInstructions(e.target.value)}
                                                placeholder="Instructions for Cursor (optional)... e.g., 'Research this, implement the feature, write tests...'"
                                                rows={4}
                                            />
                                            <div className="assign-actions">
                                                <button
                                                    className="btn btn-primary"
                                                    onClick={async () => {
                                                        await onAssignClaude(project.id, claudeInstructions);
                                                        setShowClaudeAssign(false);
                                                        setClaudeInstructions('');
                                                        onRefresh();
                                                    }}
                                                >
                                                    Assign to Cursor
                                                </button>
                                                <button
                                                    className="btn btn-secondary"
                                                    onClick={() => {
                                                        setShowClaudeAssign(false);
                                                        setClaudeInstructions('');
                                                    }}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    <p className="claude-hint">
                                        Assigning launches a Cursor Cloud Agent (requires CURSOR_API_KEY and project GitHub repo).
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="detail-section">
                            <h3>Work Log ({(project.workLog || []).length} entries)</h3>
                            <div className="detail-worklog">
                                {(project.workLog || []).length === 0 ? (
                                    <p className="empty-text">No work log entries yet.</p>
                                ) : (
                                    [...(project.workLog || [])].reverse().map(entry => (
                                        <div key={entry.id} className={`log-entry ${entry.type}`}>
                                            <div className="log-entry-header">
                                                <span className="log-entry-type">{entry.type}</span>
                                                <span className="log-entry-time">{formatDateTime(entry.timestamp)}</span>
                                            </div>
                                            <div className="log-entry-content">{entry.content}</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="detail-sidebar">
                        <div className="detail-meta">
                            <div className="meta-item">
                                <label>Status</label>
                                <span className={`status-badge ${project.status}`}>
                                    {formatStatus(project.status)}
                                </span>
                            </div>
                            <div className="meta-item">
                                <label>Priority</label>
                                <span className={`priority-badge ${project.priority}`}>
                                    {project.priority || 'Medium'}
                                </span>
                            </div>
                            <div className="meta-item">
                                <label>Due Date</label>
                                <span>{project.dueDate ? formatDate(project.dueDate) : 'Not set'}</span>
                            </div>
                            <div className="meta-item">
                                <label>Created</label>
                                <span>{formatDateTime(project.createdAt)}</span>
                            </div>
                            <div className="meta-item">
                                <label>Tags</label>
                                <div className="tags-container">
                                    {(project.tags || []).length ? (
                                        project.tags.map((tag, i) => <span key={i} className="tag">{tag}</span>)
                                    ) : (
                                        <span className="empty-text">No tags</span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="detail-actions">
                            <button 
                                className="btn btn-claude-pm" 
                                onClick={() => onClaudeReview(project.id)}
                                title="Review project state">
                                📋 Project Review
                            </button>
                            <button className="btn btn-primary" onClick={() => onEdit(project)}>Edit</button>
                            <button className="btn btn-danger" onClick={() => {
                                if (confirm('Delete this project?')) onDelete(project.id);
                            }}>Delete</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ============================================
// ONBOARDING WIZARD
// ============================================

const INTERVIEW_QUESTIONS = [
    "What problem are you solving? What's the core idea for this project?",
    "Who are the users or stakeholders?",
    "What does success look like? How will you measure it?",
    "Any constraints? (timeline, technology, budget, team size)",
    "Do you have a preferred technology stack or tools?",
    "Are there integration points with existing systems?",
    "Have you looked at existing solutions? What's different about yours?"
];

// ============================================
// DRAFT PICKER
// ============================================

const DraftPicker = ({ onStartNew, onResume, onCancel }) => {
    const [drafts, setDrafts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.listDrafts().then(data => {
            setDrafts(Array.isArray(data) ? data : []);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        await api.deleteDraft(id);
        setDrafts(prev => prev.filter(d => d.id !== id));
    };

    const stepLabels = { 1: 'Interview', 2: 'Research', 3: 'Charter', 4: 'Tasks' };

    return (
        <div className="wizard-container">
            <div className="wizard-header">
                <div className="wizard-header-left">
                    <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
                    <h2>Project Wizard</h2>
                </div>
                <div className="wizard-header-right"></div>
            </div>
            <div className="wizard-content" style={{ padding: '28px', overflowY: 'auto' }}>
                <button className="btn btn-wizard btn-large" onClick={onStartNew} style={{ marginBottom: '24px', width: '100%' }}>
                    Start New Project
                </button>

                {loading && <div className="wizard-loading"><div className="wizard-spinner"></div>Loading drafts...</div>}

                {!loading && drafts.length > 0 && (
                    <>
                        <h3 className="wizard-section-title">Resume a Draft</h3>
                        {drafts.map(d => (
                            <div key={d.id} className="draft-card" onClick={() => onResume(d.id)}>
                                <div className="draft-card-header">
                                    <span className="draft-card-title">{d.title || 'Untitled Draft'}</span>
                                    <button className="draft-card-delete" onClick={(e) => handleDelete(e, d.id)} title="Delete draft">&times;</button>
                                </div>
                                <div className="draft-card-meta">
                                    <span className="wizard-doc-badge">{stepLabels[d.step] || `Step ${d.step}`}</span>
                                    <span>{d.updatedAt ? new Date(d.updatedAt).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                                </div>
                            </div>
                        ))}
                    </>
                )}

                {!loading && drafts.length === 0 && (
                    <div className="wizard-empty">No saved drafts. Start a new project above.</div>
                )}
            </div>
        </div>
    );
};


// ============================================
// ONBOARDING WIZARD
// ============================================

const OnboardingWizard = ({ onComplete, onCancel, resumeDraftId }) => {
    const [step, setStep] = useState(1);

    // Step 1 state: Interview (frontend-driven Q&A)
    const [questionIndex, setQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [chatInput, setChatInput] = useState('');
    const [interviewBrief, setInterviewBrief] = useState('');
    const [model, setModel] = useState('');
    const [models, setModels] = useState([]);
    const [briefLoading, setBriefLoading] = useState(false);
    const chatRef = useRef(null);

    // Step 2 state: Research
    const [searchQuery, setSearchQuery] = useState('');
    const [researchPaper, setResearchPaper] = useState('');
    const [researchLoading, setResearchLoading] = useState(false);
    const [researchPhase, setResearchPhase] = useState(''); // 'searching', 'analyzing', 'writing'
    const searchAbortRef = useRef(null);

    // Step 2 state: Uploaded documents
    const [uploadedDocs, setUploadedDocs] = useState([]);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);
    const [dragActive, setDragActive] = useState(false);

    // Step 3 state: Charter
    const [projectCode, setProjectCode] = useState('');
    const [projectTitle, setProjectTitle] = useState('');
    const [charter, setCharter] = useState('');
    const [charterLoading, setCharterLoading] = useState(false);

    // Step 4 state: Tasks
    const [tasks, setTasks] = useState([]);
    const [tasksLoading, setTasksLoading] = useState(false);
    const [creating, setCreating] = useState(false);

    // Draft state
    const [draftId, setDraftId] = useState(null);
    const [draftSaving, setDraftSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);
    const saveTimerRef = useRef(null);

    // Load models on mount
    useEffect(() => {
        fetch(`${API_BASE}/chat/models`)
            .then(r => r.json())
            .then(data => {
                const modelList = data.models || [];
                setModels(modelList);
                if (modelList.length > 0) setModel(modelList[0].name);
            })
            .catch(() => {});
    }, []);

    // Resume draft on mount
    useEffect(() => {
        if (!resumeDraftId) return;
        api.getDraft(resumeDraftId).then(draft => {
            if (draft.error) return;
            setDraftId(draft.id);
            setStep(draft.step || 1);
            if (draft.model) setModel(draft.model);
            // Restore interview
            const iv = draft.interview || {};
            if (iv.questionIndex !== undefined) setQuestionIndex(iv.questionIndex);
            if (iv.answers) setAnswers(iv.answers);
            if (iv.interviewBrief) setInterviewBrief(iv.interviewBrief);
            // Restore research
            const rs = draft.research || {};
            if (rs.searchQuery) setSearchQuery(rs.searchQuery);
            if (rs.uploadedDocs) setUploadedDocs(rs.uploadedDocs);
            if (rs.researchPaper) setResearchPaper(rs.researchPaper);
            // Restore charter
            const ch = draft.charter || {};
            if (ch.projectCode) setProjectCode(ch.projectCode);
            if (ch.projectTitle) setProjectTitle(ch.projectTitle);
            if (ch.charterText) setCharter(ch.charterText);
            // Restore tasks
            if (draft.tasks) setTasks(draft.tasks);
            if (draft.title) setProjectTitle(prev => prev || draft.title);
        }).catch(() => {});
    }, [resumeDraftId]);

    // Collect draft state
    const collectDraftState = useCallback(() => ({
        title: projectTitle || 'Untitled',
        step,
        model,
        interview: { questionIndex, answers, interviewBrief },
        research: { searchQuery, uploadedDocs, researchPaper },
        charter: { projectCode, projectTitle, charterText: charter },
        tasks
    }), [step, model, questionIndex, answers, interviewBrief, searchQuery, uploadedDocs, researchPaper, projectCode, projectTitle, charter, tasks]);

    // Save draft
    const saveDraft = useCallback(async () => {
        const state = collectDraftState();
        setDraftSaving(true);
        try {
            if (draftId) {
                await api.updateDraft(draftId, state);
            } else {
                const result = await api.saveDraft(state);
                if (result.id) setDraftId(result.id);
            }
            setLastSaved(new Date());
        } catch (e) {}
        setDraftSaving(false);
    }, [draftId, collectDraftState]);

    // Auto-save on step changes (debounced)
    useEffect(() => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            // Only auto-save if there's meaningful state
            if (interviewBrief || Object.keys(answers).length > 0 || charter || tasks.length > 0) {
                saveDraft();
            }
        }, 500);
        return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
    }, [step]);

    // Save & Exit
    const handleSaveAndExit = async () => {
        await saveDraft();
        onCancel();
    };

    // Auto-scroll chat
    useEffect(() => {
        if (chatRef.current) {
            chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
    }, [questionIndex, answers]);

    // Build the chat-style display from questions + answers
    const interviewDisplay = [];
    interviewDisplay.push({ role: 'assistant', content: "Welcome! Let's define your new project. I'll ask a few questions to understand what you need." });
    for (let i = 0; i <= Math.min(questionIndex, INTERVIEW_QUESTIONS.length - 1); i++) {
        interviewDisplay.push({ role: 'assistant', content: `Question ${i + 1}/${INTERVIEW_QUESTIONS.length}: ${INTERVIEW_QUESTIONS[i]}` });
        if (answers[i] !== undefined) {
            interviewDisplay.push({ role: 'user', content: answers[i] });
        }
    }

    const submitAnswer = () => {
        if (!chatInput.trim()) return;
        const newAnswers = { ...answers, [questionIndex]: chatInput.trim() };
        setAnswers(newAnswers);
        setChatInput('');

        if (questionIndex < INTERVIEW_QUESTIONS.length - 1) {
            setQuestionIndex(questionIndex + 1);
        } else {
            // All questions answered — build brief
            buildBrief(newAnswers);
        }
    };

    const buildBrief = async (allAnswers) => {
        const labels = ['PROBLEM', 'USERS', 'SUCCESS', 'CONSTRAINTS', 'TECH_STACK', 'INTEGRATIONS', 'PRIOR_ART'];
        const briefLines = labels.map((label, i) => `${label}: ${allAnswers[i] || 'Not specified'}`);
        const rawBrief = briefLines.join('\n');
        setInterviewBrief(rawBrief);

        // Optionally summarize with AI
        if (model) {
            setBriefLoading(true);
            try {
                const result = await api.wizardAiGenerate(
                    'You are a project analyst. Summarize this interview into a concise project brief. Keep the same labeled format but make each line a clear, well-written summary. Output ONLY the brief, nothing else.',
                    rawBrief,
                    model
                );
                if (result.success && result.content) {
                    setInterviewBrief(result.content.trim());
                }
            } catch (e) {}
            setBriefLoading(false);
        }
    };

    // Step 2: Research — generate a research paper using AI
    const cancelResearch = () => {
        if (searchAbortRef.current) {
            searchAbortRef.current.abort();
            searchAbortRef.current = null;
        }
        setResearchLoading(false);
        setResearchPhase('');
    };

    const generateResearch = async (query) => {
        if (!query?.trim() && uploadedDocs.length === 0) return;
        if (searchAbortRef.current) searchAbortRef.current.abort();
        const controller = new AbortController();
        searchAbortRef.current = controller;

        setResearchLoading(true);

        // Phase 1: Web search
        let webResults = [];
        if (query?.trim()) {
            setResearchPhase('searching');
            try {
                const webRes = await fetch(`${API_BASE}/wizard/search`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query, max_results: 8 }),
                    signal: controller.signal
                }).then(r => r.json());
                webResults = webRes.results || [];
            } catch (e) {
                if (e.name === 'AbortError') return;
            }
        }
        if (controller.signal.aborted) return;

        // Phase 2: Build context and generate research paper
        setResearchPhase('writing');

        const webContext = webResults.length > 0
            ? '\n\nWeb search results:\n' + webResults.slice(0, 5).map(r => `- ${r.title}: ${r.body}`).join('\n')
            : '';
        const docContext = uploadedDocs.length > 0
            ? '\n\nUploaded documents:\n' + uploadedDocs.map(d => `[${d.filename}]: ${(d.content || '').substring(0, 1500)}`).join('\n\n')
            : '';

        try {
            const result = await api.wizardAiGenerate(
                'You are a technical analyst. Write a concise research brief in markdown for architects.',
                `Write a research brief using these inputs.

Interview:
${interviewBrief}
${webContext}
${docContext}

Use this structure:
# Research Brief: [Title]
## Problem Analysis
## Current Landscape
## Technical Considerations
## Recommended Approach
## Risks & Open Questions
## References

Be specific. Reference the actual findings.`,
                model
            );

            if (controller.signal.aborted) return;
            if (result.success && result.content) {
                setResearchPaper(result.content);
            } else {
                console.error('Research generation failed:', result);
                setResearchPaper('# Research Brief\n\nThe AI returned an empty response. You can edit this manually or click Regenerate.\n\n' +
                    (result.error ? `Error: ${result.error}` : ''));
            }
        } catch (e) {
            if (controller.signal.aborted) return;
            console.error('Research generation error:', e);
            setResearchPaper('# Research Brief\n\nFailed to generate research. You can write it manually or click Regenerate.\n\nError: ' + e.message);
        }

        setResearchLoading(false);
        setResearchPhase('');
    };

    // Document upload
    const [uploadStatus, setUploadStatus] = useState('');
    const [uploadMessage, setUploadMessage] = useState('');
    const uploadStatusTimerRef = useRef(null);

    const handleFileUpload = async (files) => {
        if (!files || files.length === 0) return;
        setUploading(true);
        setUploadStatus('uploading');
        setUploadMessage(`Uploading ${files.length} file${files.length > 1 ? 's' : ''}...`);
        let successCount = 0;
        let errorCount = 0;
        for (const file of files) {
            setUploadMessage(`Processing ${file.name}...`);
            try {
                const result = await api.uploadDocument(file);
                if (result.error) {
                    console.error('Upload failed:', result.error);
                    errorCount++;
                    continue;
                }
                setUploadedDocs(prev => [...prev, result]);
                successCount++;
            } catch (e) {
                console.error('Upload error:', e);
                errorCount++;
            }
        }
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (errorCount > 0 && successCount === 0) {
            setUploadStatus('error');
            setUploadMessage(`Failed to process ${errorCount} file${errorCount > 1 ? 's' : ''}. Check file format.`);
        } else if (errorCount > 0) {
            setUploadStatus('success');
            setUploadMessage(`${successCount} attached, ${errorCount} failed.`);
        } else {
            setUploadStatus('success');
            setUploadMessage(`${successCount} file${successCount > 1 ? 's' : ''} attached.`);
        }
        if (uploadStatusTimerRef.current) clearTimeout(uploadStatusTimerRef.current);
        uploadStatusTimerRef.current = setTimeout(() => { setUploadStatus(''); setUploadMessage(''); }, 4000);
    };

    const removeUploadedDoc = (idx) => {
        setUploadedDocs(prev => prev.filter((_, i) => i !== idx));
    };

    // Drag & drop handlers for upload zone
    const handleDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); };
    const handleDragLeaveZone = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); };
    const handleDragOverZone = (e) => { e.preventDefault(); e.stopPropagation(); };
    const handleDropZone = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        const files = Array.from(e.dataTransfer.files).filter(f =>
            f.name.endsWith('.pdf') || f.name.endsWith('.docx') || f.name.endsWith('.xlsx')
        );
        if (files.length > 0) handleFileUpload(files);
    };

    const onEnterStep2 = () => {
        // Pre-populate search query from brief, but don't auto-fire
        if (!searchQuery) {
            const lines = interviewBrief.split('\n');
            const problem = lines.find(l => /^PROBLEM/i.test(l));
            const query = problem ? problem.replace(/^PROBLEM[:\s]*/i, '').trim() : interviewBrief.substring(0, 100);
            setSearchQuery(query);
        }
    };

    // Step 3: Charter
    const onEnterStep3 = async () => {
        setCharterLoading(true);
        try {
            const codeRes = await api.getNextProjectCode();
            setProjectCode(codeRes.code || 'D-0000-001');

            // Derive title from brief
            const lines = interviewBrief.split('\n');
            const problem = lines.find(l => /^PROBLEM/i.test(l));
            const titleGuess = problem ? problem.replace(/^PROBLEM[:\s]*/i, '').trim().substring(0, 60) : 'New Project';
            if (!projectTitle) setProjectTitle(titleGuess);

            const researchContext = researchPaper
                ? '\n\nResearch Brief (produced by analyst):\n' + researchPaper
                : '';

            const result = await api.wizardAiGenerate(
                'You are a project documentation writer. Generate a project charter in markdown format.',
                `Create a project charter document using this template structure:

# {Project Title}

## Status
**Current**: Planning
**Created**: ${new Date().toLocaleDateString('en-AU')}
**Code**: ${codeRes.code}

## Overview
[description from brief]

## Scope
[derived from interview]

## Requirements
[bullet list of requirements]

## Technical Approach
[from tech stack and integration info]

## Progress
| Milestone | Status | Date |
|-----------|--------|------|
| Planning | Active | ${new Date().toLocaleDateString('en-AU')} |
| Development | - | - |
| Testing | - | - |
| Production | - | - |

## Related
[integrations and prior art]

## Notes
[constraints and additional context]

---
*Last updated: ${new Date().toLocaleDateString('en-AU')}*

Here is the interview brief:
${interviewBrief}
${researchContext}

Generate the full charter markdown now. Use the actual project details, not placeholders.`,
                model
            );

            if (result.success && result.content) {
                setCharter(result.content);
            }
        } catch (e) {
            setCharter('# New Project\n\nFailed to generate charter. Edit manually.');
        }
        setCharterLoading(false);
    };

    // Step 4: Tasks
    const onEnterStep4 = async () => {
        setTasksLoading(true);
        try {
            const result = await api.wizardAiGenerate(
                'You are a project planner. Generate a list of implementation tasks as a JSON array.',
                `Based on this project charter, suggest 5-10 implementation tasks. Each task should be suitable for a Cursor AI assistant.

Return ONLY a valid JSON array like:
[
  {
    "title": "Task title",
    "description": "What needs to be done",
    "priority": "high|medium|low",
    "claudeInstructions": "Specific instructions for Cursor"
  }
]

Project charter:
${charter}

Return the JSON array only, no other text.`,
                model
            );

            if (result.success && result.content) {
                // Robust JSON parsing
                let parsed = [];
                try {
                    // Try direct parse
                    parsed = JSON.parse(result.content);
                } catch (e) {
                    // Try extracting JSON from markdown code block
                    const jsonMatch = result.content.match(/\[[\s\S]*\]/);
                    if (jsonMatch) {
                        try { parsed = JSON.parse(jsonMatch[0]); } catch (e2) {}
                    }
                }
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setTasks(parsed.map((t, i) => ({
                        id: `wizard-task-${i}`,
                        title: t.title || 'Untitled Task',
                        description: t.description || '',
                        priority: t.priority || 'medium',
                        claudeInstructions: t.claudeInstructions || ''
                    })));
                }
            }
        } catch (e) {}
        setTasksLoading(false);
    };

    const handleNext = () => {
        const nextStep = step + 1;
        if (nextStep === 2) onEnterStep2();
        if (nextStep === 3) onEnterStep3();
        if (nextStep === 4) onEnterStep4();
        setStep(nextStep);
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
    };

    const updateTask = (idx, field, value) => {
        setTasks(prev => {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], [field]: value };
            return updated;
        });
    };

    const removeTask = (idx) => {
        setTasks(prev => prev.filter((_, i) => i !== idx));
    };

    const addTask = () => {
        setTasks(prev => [...prev, {
            id: `wizard-task-${Date.now()}`,
            title: '',
            description: '',
            priority: 'medium',
            claudeInstructions: ''
        }]);
    };

    const handleCreate = async () => {
        setCreating(true);
        try {
            const slug = projectTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            const result = await api.wizardFinalize({
                projectCode,
                title: projectTitle,
                description: interviewBrief,
                charter,
                tasks: tasks.map(t => ({
                    title: t.title,
                    description: t.description,
                    priority: t.priority,
                    claudeInstructions: t.claudeInstructions
                })),
                priority: 'medium',
                tags: ['wizard'],
                slug,
                draftId
            });
            onComplete(result);
        } catch (e) {
            alert('Failed to create project. Check console.');
        }
        setCreating(false);
    };

    const canProceed = () => {
        if (step === 1) return interviewBrief.length > 0;
        if (step === 2) return !researchLoading;
        if (step === 3) return charter.length > 0 && projectTitle.length > 0;
        return false;
    };

    // Simple markdown to HTML for preview
    const renderCharterPreview = (md) => {
        if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
            try { return DOMPurify.sanitize(marked.parse(md)); } catch (e) {}
        }
        return md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>');
    };

    return (
        <div className="wizard-container">
            {/* Header */}
            <div className="wizard-header">
                <div className="wizard-header-left">
                    <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
                    <button className="btn btn-secondary" onClick={handleSaveAndExit}>Save &amp; Exit</button>
                    <h2>New Project Wizard</h2>
                    {lastSaved && (
                        <span className="wizard-save-indicator">
                            {draftSaving ? 'Saving...' : `Saved ${lastSaved.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}
                        </span>
                    )}
                </div>
                <div className="wizard-steps">
                    {[1, 2, 3, 4].map((s, i) => (
                        <React.Fragment key={s}>
                            {i > 0 && <div className={`wizard-step-line ${step > s - 1 ? 'completed' : ''}`}></div>}
                            <div className={`wizard-step-dot ${step === s ? 'active' : step > s ? 'completed' : ''}`}>
                                {step > s ? '\u2713' : s}
                            </div>
                        </React.Fragment>
                    ))}
                </div>
                <div className="wizard-header-right">
                    {step === 1 && (
                        <select className="wizard-model-select" value={model} onChange={e => setModel(e.target.value)}>
                            {models.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                        </select>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="wizard-content">
                {/* Step 1: Interview */}
                {step === 1 && (
                    <div className="wizard-interview">
                        <div className="wizard-chat-messages" ref={chatRef}>
                            {interviewDisplay.map((msg, i) => (
                                <div key={i} className={`wizard-chat-msg ${msg.role}`}>
                                    {msg.content}
                                </div>
                            ))}
                            {briefLoading && (
                                <div className="wizard-chat-msg system">
                                    <div className="wizard-spinner" style={{display:'inline-block',marginRight:'8px',verticalAlign:'middle'}}></div>
                                    Summarizing your answers...
                                </div>
                            )}
                            {interviewBrief && !briefLoading && (
                                <div className="wizard-chat-msg system">
                                    All questions answered! Click Next to continue to Research.
                                </div>
                            )}
                        </div>
                        {!interviewBrief && (
                            <div className="wizard-chat-input">
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={e => setChatInput(e.target.value)}
                                    placeholder="Type your answer..."
                                    onKeyDown={e => { if (e.key === 'Enter') submitAnswer(); }}
                                />
                                <button className="btn btn-primary" onClick={submitAnswer} disabled={!chatInput.trim()}>
                                    Send
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 2: Research */}
                {step === 2 && !researchPaper && !researchLoading && (
                    <div className="wizard-research-start">
                        <div className="wizard-research-start-content">
                            <h3>Research &amp; Analysis</h3>
                            <p className="wizard-research-start-desc">
                                The AI will search the web, analyse your interview answers and any uploaded documents,
                                then write a research brief for the architects.
                            </p>

                            {/* Upload Zone */}
                            <div
                                className={`wizard-upload-zone ${dragActive ? 'drag-active' : ''}`}
                                onClick={() => fileInputRef.current?.click()}
                                onDragEnter={handleDragEnter}
                                onDragLeave={handleDragLeaveZone}
                                onDragOver={handleDragOverZone}
                                onDrop={handleDropZone}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf,.docx,.xlsx"
                                    multiple
                                    style={{ display: 'none' }}
                                    onChange={e => handleFileUpload(Array.from(e.target.files))}
                                />
                                {uploading
                                    ? <><div className="wizard-spinner" style={{display:'inline-block',marginRight:'8px',verticalAlign:'middle'}}></div>Uploading...</>
                                    : 'Upload reference documents (PDF, Word, Excel) — optional'
                                }
                            </div>
                            {uploadStatus && (
                                <div className={`wizard-upload-status ${uploadStatus}`}>
                                    {uploadStatus === 'uploading' && <div className="wizard-spinner" style={{display:'inline-block',marginRight:'8px',verticalAlign:'middle',width:'14px',height:'14px'}}></div>}
                                    {uploadMessage}
                                </div>
                            )}

                            {/* Uploaded doc chips */}
                            {uploadedDocs.length > 0 && (
                                <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginBottom:'16px'}}>
                                    {uploadedDocs.map((doc, i) => (
                                        <div key={i} className="wizard-uploaded-doc" style={{padding:'8px 12px',marginBottom:0}}>
                                            <div className="wizard-doc-header">
                                                <span className="wizard-doc-badge">{(doc.type || '').toUpperCase()}</span>
                                                <strong>{doc.filename}</strong>
                                                <button className="wizard-task-remove" onClick={() => removeUploadedDoc(i)} title="Remove" style={{marginLeft:'8px'}}>&times;</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="wizard-research-start-query">
                                <label>Web search query</label>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Enter a search query..."
                                    onKeyDown={e => { if (e.key === 'Enter') generateResearch(searchQuery); }}
                                />
                            </div>
                            <button
                                className="btn btn-wizard btn-large"
                                onClick={() => generateResearch(searchQuery)}
                                disabled={(!searchQuery.trim() && uploadedDocs.length === 0)}
                                style={{ width: '100%' }}
                            >
                                Generate Research Brief
                            </button>
                            <p style={{textAlign:'center',fontSize:'12px',color:'var(--text-muted)',marginTop:'8px'}}>
                                You can also skip this step and go straight to Charter.
                            </p>
                        </div>
                    </div>
                )}

                {step === 2 && researchLoading && (
                    <div className="wizard-research-start">
                        <div className="wizard-research-start-content" style={{textAlign:'center'}}>
                            <div className="wizard-spinner" style={{width:'32px',height:'32px',margin:'0 auto 16px'}}></div>
                            <h3 style={{marginBottom:'8px'}}>
                                {researchPhase === 'searching' && 'Searching the web...'}
                                {researchPhase === 'writing' && 'Writing research brief...'}
                                {!researchPhase && 'Generating research...'}
                            </h3>
                            <p className="wizard-research-start-desc">
                                {researchPhase === 'searching' && 'Finding relevant information and existing solutions.'}
                                {researchPhase === 'writing' && 'Analysing findings and composing the research document.'}
                            </p>
                            <button className="btn btn-danger" onClick={cancelResearch} style={{marginTop:'16px'}}>Cancel</button>
                        </div>
                    </div>
                )}

                {step === 2 && researchPaper && !researchLoading && (
                    <div className="wizard-charter">
                        <div className="wizard-charter-editor">
                            <div className="wizard-charter-header">
                                <span className="wizard-code-badge">RESEARCH</span>
                                <span style={{flex:1,fontSize:'14px',fontWeight:600,color:'var(--text-primary)'}}>Research Brief</span>
                                <button className="btn btn-small btn-secondary" onClick={() => generateResearch(searchQuery)} disabled={researchLoading}>
                                    Regenerate
                                </button>
                            </div>
                            <textarea
                                value={researchPaper}
                                onChange={e => setResearchPaper(e.target.value)}
                            />
                        </div>
                        <div className="wizard-charter-preview"
                            dangerouslySetInnerHTML={{ __html: renderCharterPreview(researchPaper) }}
                        />
                    </div>
                )}

                {/* Step 3: Charter */}
                {step === 3 && (
                    charterLoading ? (
                        <div className="wizard-loading"><div className="wizard-spinner"></div>Generating project charter...</div>
                    ) : (
                        <div className="wizard-charter">
                            <div className="wizard-charter-editor">
                                <div className="wizard-charter-header">
                                    <span className="wizard-code-badge">{projectCode}</span>
                                    <input
                                        type="text"
                                        value={projectTitle}
                                        onChange={e => setProjectTitle(e.target.value)}
                                        placeholder="Project title..."
                                    />
                                </div>
                                <textarea
                                    value={charter}
                                    onChange={e => setCharter(e.target.value)}
                                />
                            </div>
                            <div className="wizard-charter-preview"
                                dangerouslySetInnerHTML={{ __html: renderCharterPreview(charter) }}
                            />
                        </div>
                    )
                )}

                {/* Step 4: Tasks */}
                {step === 4 && (
                    tasksLoading ? (
                        <div className="wizard-loading"><div className="wizard-spinner"></div>Generating task breakdown...</div>
                    ) : (
                        <div className="wizard-tasks">
                            {tasks.length === 0 && (
                                <div className="wizard-empty">No tasks generated. Add tasks manually below.</div>
                            )}
                            {tasks.map((task, idx) => (
                                <div key={task.id} className="wizard-task-card">
                                    <div className="wizard-task-card-header">
                                        <input
                                            type="text"
                                            value={task.title}
                                            onChange={e => updateTask(idx, 'title', e.target.value)}
                                            placeholder="Task title..."
                                        />
                                        <select value={task.priority} onChange={e => updateTask(idx, 'priority', e.target.value)}>
                                            <option value="low">Low</option>
                                            <option value="medium">Medium</option>
                                            <option value="high">High</option>
                                            <option value="critical">Critical</option>
                                        </select>
                                        <button className="wizard-task-remove" onClick={() => removeTask(idx)} title="Remove task">&times;</button>
                                    </div>
                                    <div className="wizard-task-card-body">
                                        <label>Description</label>
                                        <textarea
                                            value={task.description}
                                            onChange={e => updateTask(idx, 'description', e.target.value)}
                                            placeholder="What needs to be done..."
                                            rows={2}
                                        />
                                        <label>Instructions</label>
                                        <textarea
                                            value={task.claudeInstructions}
                                            onChange={e => updateTask(idx, 'claudeInstructions', e.target.value)}
                                            placeholder="Specific instructions for the AI coder..."
                                            rows={2}
                                        />
                                    </div>
                                </div>
                            ))}
                            <div className="wizard-task-actions">
                                <button className="btn btn-secondary" onClick={addTask}>+ Add Task</button>
                            </div>
                        </div>
                    )
                )}
            </div>

            {/* Footer */}
            <div className="wizard-footer">
                {step > 1 && (
                    <button className="btn btn-secondary" onClick={handleBack}>Back</button>
                )}
                {step < 4 ? (
                    <button className="btn btn-primary" onClick={handleNext} disabled={!canProceed()}>
                        Next
                    </button>
                ) : (
                    <button
                        className="btn btn-wizard"
                        onClick={handleCreate}
                        disabled={creating || tasks.length === 0}
                    >
                        {creating ? 'Creating...' : 'Create Project'}
                    </button>
                )}
            </div>
        </div>
    );
};

// ============================================
// MAIN APP
// ============================================

const App = () => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState(null);
    const [detailProject, setDetailProject] = useState(null);
    const [draggedId, setDraggedId] = useState(null);
    const [hideDone, setHideDone] = useState(false);
    const [hideCancelled, setHideCancelled] = useState(true);
    const [showWizard, setShowWizard] = useState(null); // null | { picking: true } | { draftId?: string }
    const [showCrawler, setShowCrawler] = useState(false);
    const [showAllTasks, setShowAllTasks] = useState(false);
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [reviewData, setReviewData] = useState(null);
    const [reviewLoading, setReviewLoading] = useState(false);

    // Load projects
    const loadProjects = useCallback(async () => {
        try {
            setLoading(true);
            const data = await api.getProjects();
            setProjects(data);
        } catch (error) {
            showToast('Failed to load projects', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadProjects();
    }, [loadProjects]);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
    };

    // Project CRUD
    const handleSaveProject = async (data) => {
        try {
            if (data.id) {
                await api.updateProject(data.id, data);

                // Handle dependency changes
                const oldProject = projects.find(p => p.id === data.id);
                const oldDeps = oldProject?.blockedBy || [];
                const newDeps = data.blockedBy || [];

                // Remove old deps
                for (const depId of oldDeps) {
                    if (!newDeps.includes(depId)) {
                        await api.removeDependency(data.id, depId);
                    }
                }
                // Add new deps
                for (const depId of newDeps) {
                    if (!oldDeps.includes(depId)) {
                        await api.addDependency(data.id, depId);
                    }
                }

                showToast('Project updated');
            } else {
                const newProject = await api.createProject(data);
                // Add dependencies for new project
                for (const depId of data.blockedBy || []) {
                    await api.addDependency(newProject.id, depId);
                }
                showToast('Project created');
            }
            await loadProjects();
            setModalOpen(false);
            setEditingProject(null);
        } catch (error) {
            showToast('Failed to save project', 'error');
        }
    };

    const handleDeleteProject = async (id) => {
        try {
            await api.deleteProject(id);
            showToast('Project deleted');
            await loadProjects();
            setDetailProject(null);
        } catch (error) {
            showToast('Failed to delete project', 'error');
        }
    };

    const [reviewError, setReviewError] = useState(null);
    const handleClaudeReview = async (projectId) => {
        setReviewLoading(true);
        setReviewModalOpen(true);
        setReviewData(null);
        setReviewError(null);

        try {
            const result = await api.claudeReviewProject(projectId);
            if (result.success) {
                setReviewData(result.review);
            } else {
                setReviewError(result.error || 'Unknown error');
            }
        } catch (error) {
            setReviewError('Failed to connect to backend');
        } finally {
            setReviewLoading(false);
        }
    };

    // Drag and drop
    const handleDragStart = (e, id) => {
        setDraggedId(id);
        e.target.classList.add('dragging');
    };

    const handleDragEnd = (e) => {
        e.target.classList.remove('dragging');
        document.querySelectorAll('.column-content').forEach(col => col.classList.remove('drag-over'));
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
    };

    const handleDragLeave = (e) => {
        e.currentTarget.classList.remove('drag-over');
    };

    const handleDrop = async (e, newStatus) => {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');

        if (draggedId) {
            const project = projects.find(p => p.id === draggedId);
            if (project && project.status !== newStatus) {
                try {
                    if (newStatus === 'cancelled') {
                        const reason = prompt('Reason for cancelling this project:');
                        if (reason === null) { setDraggedId(null); return; } // user pressed Cancel
                        if (!reason.trim()) { showToast('Cancel reason is required', 'error'); setDraggedId(null); return; }
                        await api.updateStatus(draggedId, newStatus, reason.trim());
                    } else {
                        await api.updateStatus(draggedId, newStatus);
                    }
                    showToast(`Moved to ${formatStatus(newStatus)}`);
                    await loadProjects();
                } catch (error) {
                    showToast('Failed to update status', 'error');
                }
            }
        }
        setDraggedId(null);
    };

    // Dependencies
    const handleAddDependency = async (projectId, dependencyId) => {
        try {
            await api.addDependency(projectId, dependencyId);
            showToast('Dependency added');
            await loadProjects();
            // Refresh detail modal if open
            if (detailProject?.id === projectId) {
                const updated = (await api.getProjects()).find(p => p.id === projectId);
                setDetailProject(updated);
            }
        } catch (error) {
            showToast('Failed to add dependency', 'error');
        }
    };

    const handleRemoveDependency = async (projectId, dependencyId) => {
        try {
            await api.removeDependency(projectId, dependencyId);
            showToast('Dependency removed');
            await loadProjects();
            if (detailProject?.id === projectId) {
                const updated = (await api.getProjects()).find(p => p.id === projectId);
                setDetailProject(updated);
            }
        } catch (error) {
            showToast('Failed to remove dependency', 'error');
        }
    };

    // Sync with projects.json
    const handleSyncFromPM = async () => {
        try {
            const result = await api.syncFromPM();
            if (result.success) {
                showToast(`Synced: ${result.new_projects.length} new, ${result.updated_projects.length} updated`);
                await loadProjects();
            } else {
                showToast('Sync failed: ' + (result.error || 'Unknown error'), 'error');
            }
        } catch (error) {
            showToast('Failed to sync from projects.json', 'error');
        }
    };

    const columns = [
        { status: 'backlog', title: 'Backlog' },
        { status: 'in-progress', title: 'In Progress' },
        { status: 'review', title: 'Review' },
        { status: 'done', title: 'Done' },
        { status: 'cancelled', title: 'Cancelled' }
    ].filter(col => {
        if (hideDone && col.status === 'done') return false;
        if (hideCancelled && col.status === 'cancelled') return false;
        return true;
    });

    // Get the live version of detailProject from projects state
    const activeDetailProject = detailProject
        ? projects.find(p => p.id === detailProject.id) || detailProject
        : null;

    // Refresh and keep task board in sync
    const handleTaskBoardRefresh = async () => {
        await loadProjects();
    };

    // Show loading spinner while fetching projects
    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <div className="loading-text">Loading projects...</div>
            </div>
        );
    }

    return (
        <div className="app-container">
            {/* Show Wizard / DraftPicker */}
            {showWizard && showWizard.picking ? (
                <DraftPicker
                    onStartNew={() => setShowWizard({})}
                    onResume={(draftId) => setShowWizard({ draftId })}
                    onCancel={() => setShowWizard(null)}
                />
            ) : showWizard ? (
                <OnboardingWizard
                    resumeDraftId={showWizard.draftId}
                    onComplete={(newProject) => {
                        setShowWizard(null);
                        loadProjects().then(() => {
                            if (newProject?.id) setDetailProject(newProject);
                        });
                        showToast('Project created via Wizard!');
                    }}
                    onCancel={() => setShowWizard(null)}
                />
            ) : activeDetailProject ? (
                <TaskBoard
                    project={activeDetailProject}
                    projects={projects}
                    onBack={() => setDetailProject(null)}
                    onRefresh={handleTaskBoardRefresh}
                    onEditProject={() => { setEditingProject(activeDetailProject); setModalOpen(true); }}
                    showToast={showToast}
                />
            ) : (
                <>
                    <header className="app-header">
                        <div className="header-left">
                            <h1>Project Kanban</h1>
                            <button className="btn btn-wizard" onClick={() => setShowWizard({ picking: true })}>
                                Wizard
                            </button>
                            <button className="btn btn-cursor" onClick={() => setShowCrawler(true)}>
                                🕷️ Crawler
                            </button>
                            <button className="btn btn-secondary" onClick={() => setShowAllTasks(true)}>
                                📋 All Tasks
                            </button>
                            <button className="btn btn-primary" onClick={() => { setEditingProject(null); setModalOpen(true); }}>
                                <span className="icon">+</span> New Project
                            </button>
                        </div>
                        <div className="header-center">
                            <button
                                className={`btn btn-small ${hideDone ? 'btn-active' : 'btn-secondary'}`}
                                onClick={() => setHideDone(!hideDone)}
                            >
                                {hideDone ? 'Show Done' : 'Hide Done'}
                            </button>
                            <button
                                className={`btn btn-small ${hideCancelled ? 'btn-active' : 'btn-secondary'}`}
                                onClick={() => setHideCancelled(!hideCancelled)}
                            >
                                {hideCancelled ? 'Show Cancelled' : 'Hide Cancelled'}
                            </button>
                        </div>
                        <div className="header-right">
                            <button className="btn btn-secondary" onClick={handleSyncFromPM} title="Sync from projects.json">Sync</button>
                            <button className="btn btn-secondary" onClick={loadProjects}>Refresh</button>
                        </div>
                    </header>

                    <div className="main-content">
                        <div className="kanban-board">
                            {columns.map(col => (
                                <KanbanColumn
                                    key={col.status}
                                    status={col.status}
                                    title={col.title}
                                    projects={projects}
                                    allProjects={projects}
                                    onDrop={handleDrop}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onCardClick={setDetailProject}
                                    onDragStart={handleDragStart}
                                    onDragEnd={handleDragEnd}
                                />
                            ))}
                        </div>

                    </div>
                </>
            )}

            <CrawlerModal
                isOpen={showCrawler}
                onClose={() => setShowCrawler(false)}
                projects={projects}
                onRefresh={loadProjects}
                showToast={showToast}
            />

            <AllTasksModal
                isOpen={showAllTasks}
                onClose={() => setShowAllTasks(false)}
                projects={projects}
                onRefresh={loadProjects}
                showToast={showToast}
            />

            <ProjectModal
                isOpen={modalOpen}
                project={editingProject}
                projects={projects}
                onClose={() => { setModalOpen(false); setEditingProject(null); }}
                onSave={handleSaveProject}
            />

            <ClaudeReviewModal
                isOpen={reviewModalOpen}
                onClose={() => { setReviewModalOpen(false); setReviewError(null); }}
                reviewData={reviewData}
                loading={reviewLoading}
                error={reviewError}
                projectTitle={detailProject ? (projects.find(p => p.id === detailProject.id)?.title || '') : (reviewData?.projectId ? projects.find(p => p.id === reviewData.projectId)?.title || '' : '')}
            />

            <DetailModal
                project={activeDetailProject}
                projects={projects}
                isOpen={!!detailProject}
                onClose={() => setDetailProject(null)}
                onEdit={(p) => { setDetailProject(null); setEditingProject(p); setModalOpen(true); }}
                onDelete={handleDeleteProject}
                onAddDependency={handleAddDependency}
                onRemoveDependency={handleRemoveDependency}
                onAssignClaude={async (id, instructions) => {
                    await api.assignToClaude(id, instructions);
                    await loadProjects();
                }}
                onUnassignClaude={async (id) => {
                    await api.unassignFromClaude(id);
                    await loadProjects();
                }}
                onAnswerQuestion={async (projectId, questionId, answer) => {
                    await api.answerClaudeQuestion(projectId, questionId, answer);
                    await loadProjects();
                }}
                onRefresh={loadProjects}
                showToast={showToast}
                onClaudeReview={handleClaudeReview}
            />

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};

// Render
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
