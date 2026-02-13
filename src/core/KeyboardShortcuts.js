class KeyboardShortcuts {
    constructor() {
        this.shortcuts = new Map();
        this.enabled = true;
        this.helpModal = null;
    }

    init() {
        this._setupShortcuts();
        this._bindEvents();
        console.log('⌨️ Keyboard shortcuts initialized');
    }

    _setupShortcuts() {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const mod = isMac ? '⌘' : 'Ctrl';

        this.shortcuts = new Map([
            ['o', { action: () => this._triggerFileUpload(), description: 'Open/upload artwork', mod: true }],
            ['s', { action: () => this._triggerSave(), description: 'Save project', mod: true }],
            ['z', { action: () => this._triggerUndo(), description: 'Undo', mod: true }],
            ['Z', { action: () => this._triggerRedo(), description: 'Redo', mod: true, shift: true }],
            ['y', { action: () => this._triggerRedo(), description: 'Redo', mod: true }],
            ['e', { action: () => this._triggerExport(), description: 'Export', mod: true }],
            ['r', { action: () => this._resetArtwork(), description: 'Reset artwork position', mod: false }],
            ['f', { action: () => this._toggleFrame(), description: 'Toggle frame', mod: false }],
            ['l', { action: () => this._toggleLightingPanel(), description: 'Toggle lighting panel', mod: false }],
            [' ', { action: () => this._togglePreviewMode(), description: 'Preview mode (hold)', mod: false, hold: true }],
            ['Escape', { action: () => this._escape(), description: 'Close modals/cancel', mod: false }],
            ['?', { action: () => this._showHelp(), description: 'Show keyboard shortcuts', mod: false }],
            ['F1', { action: () => this._showHelp(), description: 'Show keyboard shortcuts', mod: false }],
            ['ArrowLeft', { action: () => this._adjustRotation(-5), description: 'Rotate left 5°', mod: false, repeat: true }],
            ['ArrowRight', { action: () => this._adjustRotation(5), description: 'Rotate right 5°', mod: false, repeat: true }],
            ['ArrowUp', { action: () => this._adjustScale(5), description: 'Increase scale', mod: false, repeat: true }],
            ['ArrowDown', { action: () => this._adjustScale(-5), description: 'Decrease scale', mod: false, repeat: true }],
            ['1', { action: () => this._switchCategory('gallery'), description: 'Gallery category', mod: false }],
            ['2', { action: () => this._switchCategory('residential'), description: 'Residential category', mod: false }],
            ['3', { action: () => this._switchCategory('artistic'), description: 'Artistic category', mod: false }],
            ['4', { action: () => this._switchCategory('studio'), description: 'Studio category', mod: false }],
            ['5', { action: () => this._switchCategory('exhibition'), description: 'Exhibition category', mod: false }],
            ['6', { action: () => this._switchCategory('packaging'), description: 'Packaging category', mod: false }],
        ]);
    }

    _bindEvents() {
        document.addEventListener('keydown', (e) => this._handleKeyDown(e));
        document.addEventListener('keyup', (e) => this._handleKeyUp(e));
    }

    _handleKeyDown(e) {
        if (!this.enabled) return;

        // Don't trigger shortcuts when typing in inputs
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
            return;
        }

        const key = e.key;
        const shortcut = this.shortcuts.get(key) || this.shortcuts.get(key.toLowerCase());

        if (!shortcut) return;

        // Check modifiers
        const hasMod = e.ctrlKey || e.metaKey;
        const hasShift = e.shiftKey;

        if (shortcut.mod && !hasMod) return;
        if (!shortcut.mod && hasMod) return;
        if (shortcut.shift && !hasShift) return;
        if (shortcut.shift === false && hasShift) return;

        // Prevent default for handled keys
        if (key !== 'F1' && key !== 'F12') {
            e.preventDefault();
        }

        // Execute action
        shortcut.action();

        // Visual feedback
        if (!shortcut.hold) {
            this._showKeyFeedback(key, shortcut.description);
        }
    }

    _handleKeyUp(e) {
        if (e.key === ' ' && this._previewModeActive) {
            this._togglePreviewMode();
        }
    }

    _triggerFileUpload() {
        document.getElementById('artwork-input')?.click();
    }

    _triggerSave() {
        // Triggered by mod+S
        // Will be implemented with ProjectManager
        this._showNotification('💾 Saving... (Ctrl+S)');
    }

    _triggerUndo() {
        if (appState.undo()) {
            this._showKeyFeedback('Undo');
        }
    }

    _triggerRedo() {
        if (appState.redo()) {
            this._showKeyFeedback('Redo');
        }
    }

    _triggerExport() {
        document.getElementById('export-btn')?.click();
    }

    _resetArtwork() {
        appState.batch({
            'artwork.scale': 100,
            'artwork.rotation': 0,
            'artwork.position.x': 0,
            'artwork.position.y': 0
        });
        this._showKeyFeedback('Reset position');
    }

    _toggleFrame() {
        const current = appState.get('frame.enabled');
        appState.set('frame.enabled', !current);
        this._showKeyFeedback(current ? 'Frame off' : 'Frame on');
    }

    _toggleLightingPanel() {
        const tabBtn = document.querySelector('.tab-btn[data-tab="lighting"]');
        if (tabBtn) tabBtn.click();
    }

    _togglePreviewMode() {
        this._previewModeActive = !this._previewModeActive;
        document.body.classList.toggle('preview-mode', this._previewModeActive);
    }

    _escape() {
        // Close any open modals
        const modals = document.querySelectorAll('dialog[open]');
        modals.forEach(m => m.close());
        
        // Remove preview mode
        document.body.classList.remove('preview-mode');
        this._previewModeActive = false;
    }

    _adjustRotation(delta) {
        const current = appState.get('artwork.rotation');
        appState.set('artwork.rotation', current + delta);
    }

    _adjustScale(delta) {
        const current = appState.get('artwork.scale');
        const newScale = Math.max(10, Math.min(500, current + delta));
        appState.set('artwork.scale', newScale);
    }

    _switchCategory(categoryId) {
        const catBtn = document.querySelector(`.category-btn[data-category="${categoryId}"]`);
        if (catBtn) catBtn.click();
    }

    _showHelp() {
        if (this.helpModal) {
            this.helpModal.close();
            this.helpModal = null;
            return;
        }

        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const mod = isMac ? '⌘' : 'Ctrl';

        const shortcuts = [
            { key: `${mod}+O`, desc: 'Open/upload artwork' },
            { key: `${mod}+S`, desc: 'Save project' },
            { key: `${mod}+Z`, desc: 'Undo' },
            { key: `${mod}+Y`, desc: 'Redo' },
            { key: `${mod}+E`, desc: 'Export' },
            { key: 'R', desc: 'Reset artwork position' },
            { key: 'F', desc: 'Toggle frame' },
            { key: 'L', desc: 'Toggle lighting panel' },
            { key: 'Space', desc: 'Preview mode (hold)' },
            { key: 'ESC', desc: 'Close modals/cancel' },
            { key: '?', desc: 'Show this help' },
            { key: '← →', desc: 'Rotate artwork' },
            { key: '↑ ↓', desc: 'Adjust scale' },
            { key: '1-6', desc: 'Switch template categories' },
        ];

        const modal = document.createElement('dialog');
        modal.className = 'modal keyboard-help-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <header class="modal-header">
                    <h2>Keyboard Shortcuts</h2>
                    <button class="close-btn" onclick="this.closest('dialog').close()">×</button>
                </header>
                <div class="keyboard-help-content" style="padding: 20px; max-height: 400px; overflow-y: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        ${shortcuts.map(s => `
                            <tr style="border-bottom: 1px solid var(--border-color);">
                                <td style="padding: 10px 20px 10px 0; font-family: monospace; color: var(--accent-secondary); font-weight: 600; white-space: nowrap;">${s.key}</td>
                                <td style="padding: 10px 0; color: var(--text-secondary);">${s.desc}</td>
                            </tr>
                        `).join('')}
                    </table>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.showModal();
        this.helpModal = modal;
        
        modal.addEventListener('close', () => {
            modal.remove();
            this.helpModal = null;
        });
    }

    _showKeyFeedback(text) {
        // Brief toast notification
        const notification = document.createElement('div');
        notification.className = 'key-feedback';
        notification.textContent = text;
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(108, 92, 231, 0.9);
            color: white;
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 13px;
            z-index: 9999;
            pointer-events: none;
            animation: fadeInOut 1s ease forwards;
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 1000);
    }

    _showNotification(text) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = text;
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #6c5ce7;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 10000;
            animation: fadeInUp 0.3s ease;
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2000);
    }

    enable() { this.enabled = true; }
    disable() { this.enabled = false; }
}

const keyboardShortcuts = new KeyboardShortcuts();