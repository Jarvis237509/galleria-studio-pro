class UIManager {
    constructor() { this.elements = {}; this.unsubscribers = []; }

    init() {
        this._cacheElements();
        this._bindEvents();
        this._bindState();
        this._initTabs();
        this._initTemplateGrid();
        this._initFrameGrid();
        this._initMoodPresets();
        this._initPresets();
    }

    _cacheElements() {
        this.elements = {
            canvas: document.getElementById('main-canvas'),
            uploadPrompt: document.getElementById('upload-prompt'),
            artworkInput: document.getElementById('artwork-input'),
            processingOverlay: document.getElementById('processing-overlay'),
            progressFill: document.getElementById('progress-fill'),
            newProjectBtn: document.getElementById('new-project-btn'),
            exportBtn: document.getElementById('export-btn'),
            exportModal: document.getElementById('export-modal'),
            templateGrid: document.getElementById('template-grid'),
            templateCategories: document.getElementById('template-categories'),
            frameGrid: document.getElementById('frame-grid'),
            moodPresets: document.getElementById('mood-presets'),
            scaleSlider: document.getElementById('artwork-scale'),
            rotationSlider: document.getElementById('artwork-rotation'),
            frameWidthSlider: document.getElementById('frame-width'),
            frameDepthSlider: document.getElementById('frame-depth'),
            frameColorInput: document.getElementById('frame-color'),
            lightIntensitySlider: document.getElementById('light-intensity'),
            lightWarmthSlider: document.getElementById('light-warmth'),
            aiBgRemove: document.getElementById('ai-bg-remove'),
            aiPerspective: document.getElementById('ai-perspective'),
            scaleValue: document.getElementById('scale-value'),
            rotationValue: document.getElementById('rotation-value')
        };
    }

    _bindEvents() {
        this.elements.uploadPrompt.addEventListener('click', () => this.elements.artworkInput.click());
        this.elements.uploadPrompt.addEventListener('dragover', (e) => { e.preventDefault(); this.elements.uploadPrompt.classList.add('drag-over'); });
        this.elements.uploadPrompt.addEventListener('dragleave', () => this.elements.uploadPrompt.classList.remove('drag-over'));
        this.elements.uploadPrompt.addEventListener('drop', (e) => { e.preventDefault(); this.elements.uploadPrompt.classList.remove('drag-over'); if (e.dataTransfer.files[0]) this._handleFileUpload(e.dataTransfer.files[0]); });
        this.elements.artworkInput.addEventListener('change', (e) => { if (e.target.files[0]) this._handleFileUpload(e.target.files[0]); });
        this.elements.newProjectBtn.addEventListener('click', () => this._resetProject());

        this._bindSlider(this.elements.scaleSlider, 'artwork.scale', v => `${v}%`);
        this._bindSlider(this.elements.rotationSlider, 'artwork.rotation', v => `${v}°`);
        this._bindSlider(this.elements.frameWidthSlider, 'frame.width', v => `${(v/10).toFixed(1)}cm`);
        this._bindSlider(this.elements.frameDepthSlider, 'frame.depth', v => `${(v/10).toFixed(1)}cm`);
        this._bindSlider(this.elements.lightIntensitySlider, 'lighting.intensity', v => `${v}%`);
        this._bindSlider(this.elements.lightWarmthSlider, 'lighting.warmth', v => `${v}K`);

        this.elements.frameColorInput.addEventListener('input', (e) => appState.set('frame.color', e.target.value));

        this.elements.exportBtn.addEventListener('click', () => this.elements.exportModal.showModal());
        document.getElementById('close-export').addEventListener('click', () => this.elements.exportModal.close());
        document.getElementById('cancel-export').addEventListener('click', () => this.elements.exportModal.close());
        document.getElementById('confirm-export').addEventListener('click', () => this._handleExport());
    }

    _bindSlider(slider, statePath, formatter) {
        const displayEl = slider.parentElement.querySelector('.value');
        slider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            appState.set(statePath, value);
            if (displayEl) displayEl.textContent = formatter(value);
        });
        this.unsubscribers.push(appState.subscribe(statePath, (value) => {
            slider.value = value;
            if (displayEl) displayEl.textContent = formatter(value);
        }));
    }

    _bindState() {
        this.unsubscribers.push(appState.subscribe('ai.processing', (processing) => {
            this.elements.processingOverlay.classList.toggle('active', processing);
        }));
        this.unsubscribers.push(appState.subscribe('ai.progress', (progress) => {
            this.elements.progressFill.style.width = `${progress * 100}%`;
        }));
        this.unsubscribers.push(appState.subscribe('template.id', (id) => {
            document.querySelectorAll('.template-card').forEach(c => c.classList.toggle('active', c.dataset.id === id));
        }));
        this.unsubscribers.push(appState.subscribe('artwork.processedImage', (img) => {
            if (img) this.elements.uploadPrompt.classList.add('hidden');
            else this.elements.uploadPrompt.classList.remove('hidden');
        }));
    }

    _initTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn, .tab-content').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
            });
        });
    }

    _initTemplateGrid() {
        const categories = TemplateLibrary.getCategories();
        this.elements.templateCategories.innerHTML = '';
        categories.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'category-btn';
            btn.dataset.category = cat.id;
            btn.innerHTML = `${cat.name} <span class="count">${cat.count}</span>`;
            btn.addEventListener('click', () => {
                document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this._loadTemplates(cat.id);
            });
            this.elements.templateCategories.appendChild(btn);
        });
        if (categories.length > 0) {
            this.elements.templateCategories.querySelector('.category-btn').classList.add('active');
            this._loadTemplates(categories[0].id);
        }
    }

    _loadTemplates(category) {
        const templates = TemplateLibrary.getByCategory(category);
        this.elements.templateGrid.innerHTML = '';
        templates.forEach(t => {
            const card = document.createElement('div');
            card.className = 'template-card';
            card.dataset.id = t.id;
            const bg = t.scene.background || t.scene.backgroundGradient?.from || '#222';
            card.innerHTML = `<div class="template-preview" style="background:${bg};height:100%"></div>`;
            card.addEventListener('click', () => {
                appState.set('template.id', t.id);
                appState.set('template.category', t.category);
            });
            this.elements.templateGrid.appendChild(card);
        });
    }

    _initFrameGrid() {
        const styles = frameSystem.getStyles().filter(s => s.id !== 'none');
        this.elements.frameGrid.innerHTML = '';
        styles.forEach(s => {
            const btn = document.createElement('button');
            btn.className = 'frame-btn';
            btn.dataset.style = s.id;
            btn.style.background = s.defaultColor || '#ccc';
            btn.title = s.name;
            btn.addEventListener('click', () => {
                document.querySelectorAll('.frame-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                appState.set('frame.style', s.id);
                appState.set('frame.color', s.defaultColor || '#ffffff');
                this.elements.frameColorInput.value = s.defaultColor || '#ffffff';
            });
            this.elements.frameGrid.appendChild(btn);
        });
    }

    _initMoodPresets() {
        const moods = lightingEngine.getMoods();
        const moodEmojis = { morning: '🌅', daylight: '☀️', gallery: '🎨', golden: '🌇', evening: '🌙' };
        this.elements.moodPresets.innerHTML = '';
        moods.forEach(m => {
            const btn = document.createElement('button');
            btn.className = 'mood-btn';
            btn.dataset.mood = m;
            btn.textContent = `${moodEmojis[m] || '💡'} ${m.charAt(0).toUpperCase() + m.slice(1)}`;
            btn.addEventListener('click', () => {
                document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                appState.set('lighting.mood', m);
                const preset = lightingEngine.getMoodPreset(m);
                appState.set('lighting.warmth', preset.warmth);
                appState.set('lighting.ambient', Math.round(preset.ambient * 100));
                this.elements.lightWarmthSlider.value = preset.warmth;
            });
            this.elements.moodPresets.appendChild(btn);
        });
        const currentMood = appState.get('lighting.mood') || 'gallery';
        const currentBtn = this.elements.moodPresets.querySelector(`[data-mood="${currentMood}"]`);
        if (currentBtn) currentBtn.classList.add('active');
    }

    _initPresets() {
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
        const firstPreset = document.querySelector('.preset-btn');
        if (firstPreset) firstPreset.classList.add('active');
    }

    async _handleFileUpload(file) {
        if (!file.type.startsWith('image/')) { alert('Please upload an image file'); return; }
        appState.set('ai.processing', true);
        appState.set('ai.progress', 0);
        try {
            const result = await aiProcessor.analyzeArtwork(file);
            const img = await this._fileToImage(file);
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            canvas.getContext('2d').drawImage(img, 0, 0);
            appState.set('artwork.processedImage', canvas);
            appState.set('project.id', crypto.randomUUID());
            this.elements.uploadPrompt.classList.add('hidden');
            if (result.suggestions?.length > 0) this._showAISuggestions(result.suggestions);
        } catch (err) {
            console.error('Upload failed:', err);
        } finally {
            appState.set('ai.processing', false);
        }
    }

    _fileToImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }

    _showAISuggestions(suggestions) {
        const card = document.getElementById('ai-suggestion');
        if (!card) return;
        card.innerHTML = `
            <div class="ai-icon">✨</div>
            <p style="margin-bottom:8px;">AI suggests these scenes:</p>
            <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">
                ${suggestions.slice(0, 3).map(s => `
                    <button class="suggest-btn" data-id="${s.id}" style="padding:6px 12px;background:rgba(108,92,231,0.3);border:1px solid #6c5ce7;border-radius:4px;color:white;cursor:pointer;font-size:12px;">${s.name}</button>
                `).join('')}
            </div>
        `;
        card.querySelectorAll('.suggest-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const template = TemplateLibrary.getById(id);
                if (template) {
                    appState.set('template.id', id);
                    const catBtn = document.querySelector(`.category-btn[data-category="${template.category}"]`);
                    if (catBtn) catBtn.click();
                }
            });
        });
    }

    async _handleExport() {
        const artwork = appState.get('artwork.processedImage');
        const template = TemplateLibrary.getById(appState.get('template.id'));
        if (!artwork || !template) { alert('Please upload artwork and select a template first'); return; }

        const presetBtn = document.querySelector('.preset-btn.active');
        const presetId = presetBtn?.dataset.preset || 'marketplace';
        appState.set('ai.processing', true);

        try {
            const targetWidth = presetId === 'social' ? 1080 : presetId === 'print' ? 4800 : 3000;
            const exportCanvas = await templateRenderer.renderForExport(template, artwork, {
                scale: appState.get('artwork.scale') / 100,
                rotation: appState.get('artwork.rotation'),
                frame: appState.get('frame'),
                lighting: appState.get('lighting')
            }, targetWidth);

            const blob = await new Promise(r => exportCanvas.toBlob(r, 'image/png'));
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `galleria-${presetId}-${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            this.elements.exportModal.close();
        } catch (err) {
            console.error('Export failed:', err);
            alert('Export failed: ' + err.message);
        } finally {
            appState.set('ai.processing', false);
        }
    }

    _resetProject() {
        appState.reset();
        this.elements.uploadPrompt.classList.remove('hidden');
        this.elements.artworkInput.value = '';
        this._initTemplateGrid();
        this._initMoodPresets();
    }
}

const uiManager = new UIManager();