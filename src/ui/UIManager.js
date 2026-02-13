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
            projectsModal: document.getElementById('projects-modal'),
            projectsContainer: document.getElementById('projects-container'),
            saveProjectName: document.getElementById('save-project-name'),
            undoBtn: document.getElementById('undo-btn'),
            redoBtn: document.getElementById('redo-btn'),
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
        this.elements.uploadPrompt.addEventListener('drop', (e) => { e.preventDefault(); this.elements.uploadPrompt.classList.remove('drag-over'); if (e.dataTransfer.files[0]) this._handleFileUpload(Array.from(e.dataTransfer.files)); });
        this.elements.artworkInput.addEventListener('change', (e) => { 
            if (e.target.files && e.target.files.length > 0) {
                this._handleFileUpload(Array.from(e.target.files));
            }
        });
        this.elements.newProjectBtn.addEventListener('click', () => this._resetProject());
        
        document.getElementById('clear-all-btn')?.addEventListener('click', () => {
            if (confirm('Clear all artworks?')) {
                batchProcessor.clear();
                this._resetProject();
            }
        });

        // Undo/Redo
        this.elements.undoBtn.addEventListener('click', () => {
            if (appState.undo()) {
                this._showNotification('↩ Undone', 1000);
                this._updateUIFromState();
            }
        });
        this.elements.redoBtn.addEventListener('click', () => {
            if (appState.redo()) {
                this._showNotification('↪ Redone', 1000);
                this._updateUIFromState();
            }
        });

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
        document.getElementById('export-watermark').addEventListener('change', (e) => {
            document.getElementById('watermark-text-group').style.display = e.target.checked ? 'block' : 'none';
        });
        
        // Projects Modal
        const projectsBtn = document.getElementById('my-projects-btn');
        if (projectsBtn) {
            projectsBtn.addEventListener('click', () => {
                this._renderProjectsList();
                this.elements.projectsModal.showModal();
            });
        }
        document.getElementById('close-projects')?.addEventListener('click', () => this.elements.projectsModal.close());
        document.getElementById('save-new-project-btn')?.addEventListener('click', () => {
            const name = this.elements.saveProjectName.value || `Project ${Date.now()}`;
            projectManager.saveProject(name);
            this.elements.saveProjectName.value = '';
            this._renderProjectsList();
            this._showNotification('💾 Project saved!');
        });
        document.getElementById('export-json-btn')?.addEventListener('click', () => {
            projectManager.exportProject();
            this._showNotification('📤 Project exported!');
        });
        document.getElementById('import-json-input')?.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                projectManager.importProject(e.target.files[0])
                    .then(() => {
                        this._updateUIFromState();
                        this.elements.projectsModal.close();
                        this._showNotification('📥 Project imported!');
                    })
                    .catch(err => alert('Failed to import: ' + err.message));
            }
        });
    }

    _renderProjectsList() {
        const container = this.elements.projectsContainer;
        const projects = projectManager.listProjects();
        
        if (projects.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:40px;color:var(--text-tertiary);">
                    <p>No saved projects yet</p>
                    <p style="font-size:13px;margin-top:8px;">Upload artwork and save your first project</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;padding:20px;">
                ${projects.map(p => `
                    <div class="project-card" data-id="${p.id}" style="background:var(--bg-tertiary);border-radius:12px;overflow:hidden;cursor:pointer;position:relative;">
                        <div style="aspect-ratio:4/3;background:#1a1a24;display:flex;align-items:center;justify-content:center;">
                            ${p.thumbnail ? `<img src="${p.thumbnail}" style="width:100%;height:100%;object-fit:cover;">` : '<span>🎨</span>'}
                        </div>
                        <div style="padding:12px;">
                            <p style="font-weight:600;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.name}</p>
                            <p style="font-size:12px;color:var(--text-tertiary);">${new Date(p.updatedAt).toLocaleDateString()}</p>
                        </div>
                        <button class="project-delete" data-id="${p.id}" style="position:absolute;top:8px;right:8px;width:28px;height:28px;border-radius:50%;background:rgba(0,0,0,0.5);border:none;color:#fff;cursor:pointer;display:none;align-items:center;justify-content:center;">×</button>
                    </div>
                `).join('')}
            </div>
        `;

        container.querySelectorAll('.project-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.classList.contains('project-delete')) {
                    e.stopPropagation();
                    if (confirm('Delete this project?')) {
                        projectManager.deleteProject(card.dataset.id);
                        this._renderProjectsList();
                    }
                } else {
                    projectManager.loadProject(card.dataset.id);
                    this.elements.projectsModal.close();
                    this._updateUIFromState();
                    this._showNotification('📂 Project loaded!');
                }
            });
            card.addEventListener('mouseenter', () => {
                card.querySelector('.project-delete').style.display = 'flex';
            });
            card.addEventListener('mouseleave', () => {
                card.querySelector('.project-delete').style.display = 'none';
            });
        });
    }

    _bindSlider(slider, statePath, formatter) {
        const displayEl = slider.parentElement.querySelector('.value');
        slider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            appState.set(statePath, value);
            if (displayEl) displayEl.textContent = formatter(value);
            if (statePath === 'artwork.scale') batchProcessor.updateActive({ scale: value });
            if (statePath === 'artwork.rotation') batchProcessor.updateActive({ rotation: value });
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
        this._updateHistoryButtons();
    }
    
    _updateHistoryButtons() {
        if (this.elements.undoBtn) this.elements.undoBtn.disabled = !appState.canUndo();
        if (this.elements.redoBtn) this.elements.redoBtn.disabled = !appState.canRedo();
    }
    
    _updateUIFromState() {
        this.elements.scaleSlider.value = appState.get('artwork.scale');
        this.elements.rotationSlider.value = appState.get('artwork.rotation');
        this.elements.frameWidthSlider.value = appState.get('frame.width');
        this.elements.frameDepthSlider.value = appState.get('frame.depth');
        this.elements.frameColorInput.value = appState.get('frame.color');
        this.elements.lightIntensitySlider.value = appState.get('lighting.intensity');
        this.elements.lightWarmthSlider.value = appState.get('lighting.warmth');
        this._updateSliderDisplays();
        this._updateHistoryButtons();
    }
    
    _updateSliderDisplays() {
        const scaleDisplay = this.elements.scaleSlider.parentElement?.querySelector('.value');
        if (scaleDisplay) scaleDisplay.textContent = `${appState.get('artwork.scale')}%`;
        const rotationDisplay = this.elements.rotationSlider.parentElement?.querySelector('.value');
        if (rotationDisplay) rotationDisplay.textContent = `${appState.get('artwork.rotation')}°`;
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
            card.innerHTML = `<div class="template-preview" style="background:${t.scene.background || t.scene.backgroundGradient?.from || '#222'};height:100%"></div>`;
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
            });
            this.elements.moodPresets.appendChild(btn);
        });
    }

    _initPresets() {
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }

    async _handleFileUpload(fileOrFiles) {
        const files = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];
        if (!files.length) return;
        if (!files[0].type.startsWith('image/')) { alert('Please upload image files'); return; }
        
        appState.set('ai.processing', true);
        const options = {
            backgroundRemoval: this.elements.aiBgRemove?.checked ?? true,
            perspectiveCorrection: this.elements.aiPerspective?.checked ?? true,
            colorEnhancement: document.getElementById('ai-color-enhance')?.checked ?? false
        };

        try {
            const results = await batchProcessor.uploadBatch(files, options);
            if (results.length > 0) {
                this.elements.uploadPrompt.classList.add('hidden');
                this._updateBatchGallery();
                if (results[0].suggestions?.length > 0) this._showAISuggestions(results[0].suggestions);
                this._showNotification(`📚 Processed ${results.length} artworks`);
            }
        } catch (err) {
            console.error('Upload failed:', err);
            if (files.length === 1) await this._handleSingleFileUpload(files[0], options);
        } finally {
            appState.set('ai.processing', false);
        }
    }

    async _handleSingleFileUpload(file, options) {
        const result = await aiProcessor.analyzeArtwork(file, options);
        const processedCanvas = result.processedCanvas || await this._imageToCanvas(result);
        batchProcessor.artworks.push({
            id: crypto.randomUUID(),
            name: file.name.replace(/\.[^/.]+$/, ''),
            canvas: processedCanvas,
            scale: 100,
            rotation: 0,
            position: { x: 0, y: 0 },
            addedAt: new Date().toISOString()
        });
        batchProcessor.setActive(batchProcessor.artworks.length - 1);
        this.elements.uploadPrompt.classList.add('hidden');
        this._updateBatchGallery();
        if (result.suggestions?.length > 0) this._showAISuggestions(result.suggestions);
    }

    async _imageToCanvas(img) {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext('2d').drawImage(img, 0, 0);
        return canvas;
    }

    _showAISuggestions(suggestions) {
        const card = document.getElementById('ai-suggestion');
        if (!card) return;
        card.innerHTML = `
            <div class="ai-icon">✨</div>
            <p>AI suggests:</p>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                ${suggestions.slice(0, 3).map(s => `
                    <button data-id="${s.id}">${s.name}</button>
                `).join('')}
            </div>
        `;
        card.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                appState.set('template.id', btn.dataset.id);
            });
        });
    }

    async _handleExport() {
        const artwork = appState.get('artwork.processedImage');
        const template = TemplateLibrary.getById(appState.get('template.id'));
        if (!artwork || !template) { alert('Please upload artwork and select a template first'); return; }

        const presetId = document.querySelector('.preset-btn.active')?.dataset.preset || 'marketplace';
        appState.set('ai.processing', true);
        
        try {
            const config = {
                preset: presetId,
                frame: appState.get('frame'),
                lighting: appState.get('lighting'),
                scale: appState.get('artwork.scale') / 100,
                rotation: appState.get('artwork.rotation')
            };
            const pack = await this._generateExportPack(template, artwork, config);
            for (const file of pack.files) {
                await exportEngine.downloadFile(file.blob, file.name);
            }
            this.elements.exportModal.close();
            this._showNotification(`Exported ${pack.files.length} images!`);
        } catch (err) {
            console.error('Export failed:', err);
            alert('Export failed: ' + err.message);
        } finally {
            appState.set('ai.processing', false);
        }
    }

    async _generateExportPack(template, artwork, config) {
        const preset = exportEngine.getPreset(config.preset) || exportEngine.getPreset('marketplace');
        const format = exportEngine.formatSettings[config.preset === 'social' ? 'jpg-med' : 'jpg-high'];
        const pack = { name: preset.name, files: [] };
        for (const size of preset.sizes) {
            const canvas = await templateRenderer.renderForExport(template, artwork, config, size.width);
            const blob = await exportEngine.canvasToBlob(canvas, format.mimeType, format.quality);
            pack.files.push({ name: `artwork-${size.name}.${format.ext}`, blob, type: format.mimeType });
        }
        return pack;
    }

    _updateBatchGallery() {
        const container = document.getElementById('batch-gallery-list');
        const artworks = batchProcessor.getArtworks();
        document.getElementById('artwork-count').textContent = artworks.length;
        if (artworks.length === 0) { container.innerHTML = ''; return; }
        container.innerHTML = artworks.map((artwork, i) => `
            <div class="batch-thumb ${i === batchProcessor.getActiveIndex() ? 'active' : ''}" data-index="${i}">
                <img src="${artwork.canvas.toDataURL('image/jpeg', 0.5)}">
                <button class="batch-remove" data-index="${i}">×</button>
            </div>
        `).join('');
        container.querySelectorAll('.batch-thumb').forEach(thumb => {
            thumb.addEventListener('click', (e) => {
                const index = parseInt(thumb.dataset.index);
                if (e.target.classList.contains('batch-remove')) {
                    e.stopPropagation();
                    batchProcessor.remove(index);
                    this._updateBatchGallery();
                } else {
                    batchProcessor.setActive(index);
                    this._updateUIFromState();
                    this._updateBatchGallery();
                }
            });
        });
    }

    _resetProject() {
        appState.reset();
        batchProcessor.clear();
        this._updateBatchGallery();
        this.elements.uploadPrompt.classList.remove('hidden');
        this.elements.artworkInput.value = '';
    }

    _showNotification(message, duration = 3000) {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed; bottom: 20px; right: 20px;
            background: #6c5ce7; color: white;
            padding: 12px 24px; border-radius: 8px;
            z-index: 10000; animation: fadeInUp 0.3s ease;
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), duration);
    }
}

const uiManager = new UIManager();