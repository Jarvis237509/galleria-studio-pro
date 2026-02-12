class UIManager {
    constructor() { this.elements = {}; this.unsubscribers = []; }
    init() { this._cacheElements(); this._bindEvents(); this._bindState(); this._initTabs(); this._initTemplateGrid(); this._initFrameGrid(); this._initMoodPresets(); }
    _cacheElements() {
        this.elements = {
            canvas: document.getElementById('main-canvas'), uploadPrompt: document.getElementById('upload-prompt'), artworkInput: document.getElementById('artwork-input'),
            processingOverlay: document.getElementById('processing-overlay'), processingText: document.getElementById('processing-text'), progressFill: document.getElementById('progress-fill'),
            newProjectBtn: document.getElementById('new-project-btn'), exportBtn: document.getElementById('export-btn'), exportModal: document.getElementById('export-modal'),
            templateGrid: document.getElementById('template-grid'), templateCategories: document.getElementById('template-categories'), frameGrid: document.getElementById('frame-grid'), moodPresets: document.getElementById('mood-presets'),
            scaleSlider: document.getElementById('artwork-scale'), rotationSlider: document.getElementById('artwork-rotation'), frameWidthSlider: document.getElementById('frame-width'), frameDepthSlider: document.getElementById('frame-depth'), frameColorInput: document.getElementById('frame-color'), lightIntensitySlider: document.getElementById('light-intensity'), lightWarmthSlider: document.getElementById('light-warmth'),
            aiBgRemove: document.getElementById('ai-bg-remove'), aiPerspective: document.getElementById('ai-perspective'), aiColorEnhance: document.getElementById('ai-color-enhance'),
            scaleValue: document.getElementById('scale-value'), rotationValue: document.getElementById('rotation-value'), zoomLevel: document.getElementById('zoom-level')
        };
    }
    _bindEvents() {
        this.elements.uploadPrompt.addEventListener('click', () => this.elements.artworkInput.click());
        this.elements.uploadPrompt.addEventListener('drop', (e) => { e.preventDefault(); if (e.dataTransfer.files[0]) this._handleFileUpload(e.dataTransfer.files[0]); });
        this.elements.artworkInput.addEventListener('change', (e) => { if (e.target.files[0]) this._handleFileUpload(e.target.files[0]); });
        this.elements.newProjectBtn.addEventListener('click', () => this._resetProject());
        this._bindSlider(this.elements.scaleSlider, 'artwork.scale', v => `${v}%`);
        this._bindSlider(this.elements.rotationSlider, 'artwork.rotation', v => `${v}°`);
        this.elements.exportBtn.addEventListener('click', () => this.elements.exportModal.showModal());
        document.getElementById('close-export').addEventListener('click', () => this.elements.exportModal.close());
        document.getElementById('cancel-export').addEventListener('click', () => this.elements.exportModal.close());
        document.getElementById('confirm-export').addEventListener('click', () => this._handleExport());
    }
    _bindSlider(slider, statePath, formatter) {
        const displayEl = slider.parentElement.querySelector('.value');
        slider.addEventListener('input', (e) => { const value = parseInt(e.target.value); appState.set(statePath, value); if (displayEl) displayEl.textContent = formatter(value); });
        this.unsubscribers.push(appState.subscribe(statePath, (value) => { slider.value = value; if (displayEl) displayEl.textContent = formatter(value); }));
    }
    _bindState() {
        this.unsubscribers.push(appState.subscribe('ai.processing', (processing) => this.elements.processingOverlay.classList.toggle('active', processing)));
        this.unsubscribers.push(appState.subscribe('ai.progress', (progress) => this.elements.progressFill.style.width = `${progress * 100}%`));
        this.unsubscribers.push(appState.subscribe('template.id', (id) => { document.querySelectorAll('.template-card').forEach(c => c.classList.toggle('active', c.dataset.id === id)); }));
    }
    _initTabs() { document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => { document.querySelectorAll('.tab-btn, .tab-content').forEach(b => b.classList.remove('active')); btn.classList.add('active'); document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active'); })); }
    _initTemplateGrid() { const categories = TemplateLibrary.getCategories(); categories.forEach(cat => { const btn = document.createElement('button'); btn.className = 'category-btn'; btn.dataset.category = cat.id; btn.innerHTML = `${cat.name} <span class="count">${cat.count}</span>`; btn.addEventListener('click', () => { document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); this._loadTemplates(cat.id); }); this.elements.templateCategories.appendChild(btn); }); this.elements.templateCategories.querySelector('.category-btn')?.classList.add('active'); this._loadTemplates(categories[0].id); }
    _loadTemplates(category) { const templates = TemplateLibrary.getByCategory(category); this.elements.templateGrid.innerHTML = ''; templates.forEach(t => { const card = document.createElement('div'); card.className = 'template-card'; card.dataset.id = t.id; const bg = t.scene.background || t.scene.backgroundGradient?.from || '#222'; card.innerHTML = `<div class="template-preview" style="background:${bg};height:100%"></div>`; card.addEventListener('click', () => { appState.set('template.id', t.id); appState.set('template.category', category); }); this.elements.templateGrid.appendChild(card); }); }
    _initFrameGrid() { const styles = frameSystem.getStyles(); this.elements.frameGrid.innerHTML = ''; styles.forEach(s => { const btn = document.createElement('button'); btn.className = 'frame-btn'; btn.dataset.style = s.id; btn.style.background = s.defaultColor; btn.addEventListener('click', () => { document.querySelectorAll('.frame-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); appState.set('frame.style', s.id); }); this.elements.frameGrid.appendChild(btn); }); }
    _initMoodPresets() { const moods = lightingEngine.getMoods(); const moodEmojis = { morning: '🌅', daylight: '☀️', gallery: '🎨', golden: '🌇', evening: '🌙' }; this.elements.moodPresets.innerHTML = ''; moods.forEach(m => { const btn = document.createElement('button'); btn.className = 'mood-btn'; btn.dataset.mood = m; btn.textContent = `${moodEmojis[m]} ${m.charAt(0).toUpperCase() + m.slice(1)}`; btn.addEventListener('click', () => { document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); appState.set('lighting.mood', m); }); this.elements.moodPresets.appendChild(btn); }); }
    async _handleFileUpload(file) { if (!file.type.startsWith('image/')) return; appState.set('ai.processing', true); appState.set('ai.progress', 0); try { const result = await aiProcessor.processArtwork(file, { removeBackground: this.elements.aiBgRemove.checked, perspectiveCorrect: this.elements.aiPerspective.checked }); appState.batch({ 'artwork.sourceImage': file, 'artwork.processedImage': result.processedImage, 'project.id': crypto.randomUUID() }); this.elements.uploadPrompt.classList.add('hidden'); if (result.metadata?.suggestions) this._showAISuggestions(result.metadata.suggestions); } finally { appState.set('ai.processing', false); } }
    _showAISuggestions(suggestions) { const card = document.getElementById('ai-suggestion'); card.innerHTML = `<div class="ai-icon">✨</div><p>AI suggests:</p>${suggestions.slice(0, 3).map(s => `<button class="suggest-btn" data-id="${s.id}">${s.name}</button>`).join('')}`; }
    async _handleExport() { alert('Export coming in Phase 2'); this.elements.exportModal.close(); }
    _resetProject() { appState.reset(); this.elements.uploadPrompt.classList.remove('hidden'); this.elements.artworkInput.value = ''; }
}
const uiManager = new UIManager();