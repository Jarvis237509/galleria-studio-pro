class ProjectManager {
    constructor() {
        this.STORAGE_KEY = 'galleria_projects';
        this.AUTO_SAVE_KEY = 'galleria_autosave';
        this.autoSaveInterval = null;
        this.lastSavedState = null;
    }

    init() {
        this._loadAutoSave();
        this._setupAutoSave();
        console.log('💾 Project Manager initialized');
    }

    _setupAutoSave() {
        // Auto-save every 30 seconds when artwork is present
        this.autoSaveInterval = setInterval(() => {
            const hasArtwork = appState.get('artwork.processedImage');
            if (hasArtwork) {
                this.autoSave();
            }
        }, 30000);
    }

    autoSave() {
        const state = appState.get();
        const stateJson = JSON.stringify(state);
        
        // Only save if state has changed
        if (stateJson !== this.lastSavedState) {
            const autoSave = {
                state: state,
                savedAt: new Date().toISOString(),
                name: state.project?.name || 'Auto-saved'
            };
            localStorage.setItem(this.AUTO_SAVE_KEY, JSON.stringify(autoSave));
            this.lastSavedState = stateJson;
            console.log('💾 Auto-saved project');
        }
    }

    _loadAutoSave() {
        try {
            const autoSave = JSON.parse(localStorage.getItem(this.AUTO_SAVE_KEY));
            if (autoSave?.state?.artwork?.processedImage) {
                // Restore auto-saved state
                appState.state = JSON.parse(JSON.stringify(autoSave.state));
                console.log('💾 Restored auto-saved project');
                return true;
            }
        } catch (e) {
            console.error('Failed to load auto-save:', e);
        }
        return false;
    }

    saveProject(name) {
        if (!name || name.trim() === '') {
            name = 'Untitled Project';
        }

        const state = appState.get();
        const projects = this._getProjects();
        
        // Generate thumbnail from current canvas
        const thumbnail = this._generateThumbnail();
        
        const project = {
            id: crypto.randomUUID(),
            name: name.trim(),
            state: JSON.parse(JSON.stringify(state)),
            thumbnail: thumbnail,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        projects.push(project);
        this._setProjects(projects);

        // Update project ID in state
        appState.set('project.id', project.id);
        appState.set('project.name', project.name);

        console.log('💾 Saved project:', project.name);
        return project;
    }

    loadProject(projectId) {
        const projects = this._getProjects();
        const project = projects.find(p => p.id === projectId);
        
        if (!project) {
            throw new Error('Project not found');
        }

        // Restore state
        appState.state = JSON.parse(JSON.stringify(project.state));
        
        // Re-create canvas from stored image data
        if (project.state?.artwork?.processedImage) {
            // Note: canvas can't be stored, so we'd need to store base64
            // For now, artwork won't persist through save/load
        }

        // Trigger re-render
        appState._notify('state.reset', appState.state);
        console.log('💾 Loaded project:', project.name);
        
        return project;
    }

    deleteProject(projectId) {
        const projects = this._getProjects();
        const filtered = projects.filter(p => p.id !== projectId);
        this._setProjects(filtered);
        console.log('💾 Deleted project:', projectId);
    }

    listProjects() {
        return this._getProjects().map(p => ({
            id: p.id,
            name: p.name,
            thumbnail: p.thumbnail,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt
        }));
    }

    updateProject(projectId, updates) {
        const projects = this._getProjects();
        const index = projects.findIndex(p => p.id === projectId);
        
        if (index === -1) {
            throw new Error('Project not found');
        }

        const project = projects[index];
        project.name = updates.name || project.name;
        
        if (updates.state) {
            project.state = JSON.parse(JSON.stringify(updates.state));
            project.thumbnail = this._generateThumbnail();
        }
        
        project.updatedAt = new Date().toISOString();
        this._setProjects(projects);
        
        return project;
    }

    exportProject() {
        const state = appState.get();
        const exportData = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            state: state
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `galleria-project-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('💾 Exported project');
    }

    async importProject(file) {
        try {
            const text = await file.text();
            const importData = JSON.parse(text);
            
            if (!importData.state) {
                throw new Error('Invalid project file');
            }
            
            // Restore state
            appState.state = JSON.parse(JSON.stringify(importData.state));
            appState._notify('state.reset', appState.state);
            
            console.log('💾 Imported project');
            return true;
        } catch (e) {
            console.error('Failed to import project:', e);
            throw e;
        }
    }

    _getProjects() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Failed to load projects:', e);
            return [];
        }
    }

    _setProjects(projects) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(projects));
    }

    _generateThumbnail() {
        // Try to generate thumbnail from canvas
        const canvas = document.getElementById('main-canvas');
        if (canvas) {
            try {
                // Create small thumbnail
                const thumbCanvas = document.createElement('canvas');
                thumbCanvas.width = 200;
                thumbCanvas.height = Math.round(200 * (canvas.height / canvas.width));
                const ctx = thumbCanvas.getContext('2d');
                ctx.imageSmoothingEnabled = true;
                ctx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
                return thumbCanvas.toDataURL('image/jpeg', 0.7);
            } catch (e) {
                console.error('Failed to generate thumbnail:', e);
            }
        }
        return null;
    }

    clearAutoSave() {
        localStorage.removeItem(this.AUTO_SAVE_KEY);
    }
}

const projectManager = new ProjectManager();