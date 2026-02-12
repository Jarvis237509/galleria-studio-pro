class State {
    constructor() {
        this.state = {
            project: { id: null, name: 'Untitled', createdAt: null },
            artwork: {
                sourceImage: null, processedImage: null,
                dimensions: { width: 60, height: 80, unit: 'cm' },
                position: { x: 0, y: 0 }, scale: 1, rotation: 0,
                backgroundRemoved: false, perspectiveCorrected: false
            },
            template: { id: null, category: 'gallery', variant: null },
            frame: {
                enabled: true, style: 'minimal-white', width: 2.0, depth: 1.5,
                color: '#ffffff', matting: 0,
                shadow: { enabled: true, offset: { x: 3, y: 3 }, blur: 10, opacity: 0.3 }
            },
            lighting: {
                source: { x: 0.5, y: 0.2 }, intensity: 1.0, warmth: 4000,
                ambient: 0.3, shadowSoftness: 0.6, mood: 'gallery'
            },
            layout: { artworks: [], arrangement: 'single', spacing: 10 },
            ui: { activeTab: 'templates', zoom: 1, darkMode: true },
            ai: {
                processing: false, progress: 0,
                operations: { backgroundRemoval: true, perspective: true, colorEnhance: false }
            }
        };
        this.listeners = new Map();
        this.history = []; this.historyIndex = -1; this.maxHistory = 50;
    }
    init() { return Promise.resolve(); }
    get(path = null) {
        if (!path) return JSON.parse(JSON.stringify(this.state));
        const keys = path.split('.');
        let value = this.state;
        for (const key of keys) { if (value == null) return undefined; value = value[key]; }
        return JSON.parse(JSON.stringify(value));
    }
    set(path, value) {
        const keys = path.split('.');
        const newState = JSON.parse(JSON.stringify(this.state));
        let target = newState;
        for (let i = 0; i < keys.length - 1; i++) target = target[keys[i]];
        target[keys[keys.length - 1]] = value;
        this._saveToHistory();
        this.state = newState;
        this._notify(path, value);
        this._notify('state.changed', { path, value });
        return this;
    }
    batch(updates) {
        this._saveToHistory();
        for (const [path, value] of Object.entries(updates)) {
            const keys = path.split('.');
            let target = this.state;
            for (let i = 0; i < keys.length - 1; i++) target = target[keys[i]];
            target[keys[keys.length - 1]] = value;
        }
        this.state = JSON.parse(JSON.stringify(this.state));
        this._notify('state.batch', updates);
        return this;
    }
    subscribe(path, callback) {
        if (!this.listeners.has(path)) this.listeners.set(path, new Set());
        this.listeners.get(path).add(callback);
        return () => this.listeners.get(path).delete(callback);
    }
    _notify(path, data) {
        if (this.listeners.has(path)) this.listeners.get(path).forEach(cb => cb(data, path));
        const parts = path.split('.');
        for (let i = parts.length - 1; i > 0; i--) {
            const parentPath = parts.slice(0, i).join('.');
            if (this.listeners.has(parentPath)) this.listeners.get(parentPath).forEach(cb => cb(this.get(parentPath), parentPath));
        }
        if (this.listeners.has('*')) this.listeners.get('*').forEach(cb => cb(data, path));
    }
    _saveToHistory() {
        if (this.historyIndex < this.history.length - 1) this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(JSON.parse(JSON.stringify(this.state)));
        if (this.history.length > this.maxHistory) this.history.shift(); else this.historyIndex++;
    }
    undo() { if (this.historyIndex > 0) { this.historyIndex--; this.state = JSON.parse(JSON.stringify(this.history[this.historyIndex])); this._notify('state.undo', this.state); return true; } return false; }
    redo() { if (this.historyIndex < this.history.length - 1) { this.historyIndex++; this.state = JSON.parse(JSON.stringify(this.history[this.historyIndex])); this._notify('state.redo', this.state); return true; } return false; }
    reset() { this._saveToHistory(); Object.assign(this.state, new State().state); this._notify('state.reset', this.state); return this; }
    serialize() { return JSON.stringify({ project: this.state.project, artwork: this.state.artwork, template: this.state.template, frame: this.state.frame, lighting: this.state.lighting, layout: this.state.layout }); }
}
const appState = new State();