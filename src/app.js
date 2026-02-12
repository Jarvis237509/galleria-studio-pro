class GalleriaApp {
    constructor() { this.initialized = false; this.renderEngine = null; this.uiManager = uiManager; }
    async init() {
        console.log('🎨 Galleria Studio Pro - Initializing');
        this.renderEngine = new CanvasEngine('main-canvas'); window.mainRenderer = this.renderEngine;
        this._setupLayers(); this.uiManager.init(); this._bindStateToRender(); this._startRenderLoop();
        this.initialized = true;
        console.log('✅ Galleria Studio Pro - Ready');
    }
    _setupLayers() {
        this.renderEngine.createLayer('background', { zIndex: 0, render: (ctx) => { const t = this._getCurrentTemplate(); if (t) this._renderTemplateBackground(ctx, t); } });
        this.renderEngine.createLayer('frame-shadow', { zIndex: 1, render: (ctx) => { const f = appState.get('frame'); if (f.enabled) this._renderFrameShadow(ctx, f); } });
        this.renderEngine.createLayer('artwork', { zIndex: 2, render: (ctx) => { const a = appState.get('artwork'), f = appState.get('frame'); if (a.processedImage) this._renderFramedArtwork(ctx, a, f); } });
        this.renderEngine.createLayer('lighting', { zIndex: 3, blendMode: 'soft-light', opacity: 0.6, render: (ctx) => { const l = appState.get('lighting'), t = this._getCurrentTemplate(); if (t) lightingEngine.applyLighting(ctx, lightingEngine.calculateSceneLighting(l), { width: ctx.canvas.width, height: ctx.canvas.height }); } });
    }
    _bindStateToRender() { ['artwork.scale', 'artwork.rotation', 'frame', 'lighting', 'template.id'].forEach(p => appState.subscribe(p, () => this.renderEngine.requestRender())); }
    _startRenderLoop() { const loop = () => { this.renderEngine.render(); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
    _getCurrentTemplate() { const id = appState.get('template.id'); return id ? TemplateLibrary.getById(id) : null; }
    _renderTemplateBackground(ctx, template) {
        const w = ctx.canvas.width, h = ctx.canvas.height;
        if (template.scene.backgroundGradient) { const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, template.scene.backgroundGradient.from); g.addColorStop(1, template.scene.backgroundGradient.to); ctx.fillStyle = g; } else { ctx.fillStyle = template.scene.background || '#1a1a1a'; }
        ctx.fillRect(0, 0, w, h);
        if (template.scene.floor) { const fh = h * 0.25; const fg = ctx.createLinearGradient(0, h - fh, 0, h); fg.addColorStop(0, template.scene.floor.color); fg.addColorStop(1, '#000'); ctx.fillStyle = fg; ctx.fillRect(0, h - fh, w, fh); }
    }
    _renderFrameShadow(ctx, frame) {
        const a = appState.get('artwork'); if (!a.processedImage) return;
        const l = appState.get('lighting');
        const shadow = frameSystem.calculateShadow({ frameWidth: frame.width * 10, frameDepth: frame.depth * 10, lightPosition: l.source });
    }
    _renderFramedArtwork(ctx, artwork, frame) {
        const img = artwork.processedImage;
        const w = img.width * artwork.scale, h = img.height * artwork.scale;
        const cx = ctx.canvas.width / 2, cy = ctx.canvas.height / 2;
        ctx.save(); ctx.translate(cx + artwork.position.x, cy + artwork.position.y); ctx.rotate((artwork.rotation * Math.PI) / 180);
        if (frame.enabled && frame.style !== 'none') frameSystem.renderFrame(ctx, { width: w, height: h, frameStyle: frame.style, frameWidth: frame.width * 10, frameDepth: frame.depth * 10, frameColor: frame.color, matting: frame.matting, lightPosition: appState.get('lighting.source') });
        ctx.drawImage(img, -w / 2, -h / 2, w, h); ctx.restore();
    }
}
document.addEventListener('DOMContentLoaded', () => { window.galleriaApp = new GalleriaApp(); window.galleriaApp.init(); });