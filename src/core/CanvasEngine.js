class CanvasEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d', { alpha: true, desynchronized: true });
        this.renderCanvas = document.createElement('canvas');
        this.renderCtx = this.renderCanvas.getContext('2d', { alpha: true });
        this.width = 0; this.height = 0; this.dpr = window.devicePixelRatio || 1;
        this.layers = new Map(); this.layerOrder = [];
        this.lastFrameTime = 0; this.frameCount = 0; this.fps = 0;
        this.renderRAF = null; this.needsRender = false;
        this._setupCanvas(); this._bindEvents();
    }
    _setupCanvas() {
        const container = this.canvas.parentElement;
        this.setSize(container.clientWidth, container.clientHeight);
        this.ctx.imageSmoothingEnabled = true; this.ctx.imageSmoothingQuality = 'high';
        this.renderCtx.imageSmoothingEnabled = true; this.renderCtx.imageSmoothingQuality = 'high';
    }
    _bindEvents() { window.addEventListener('resize', () => { const container = this.canvas.parentElement; this.setSize(container.clientWidth, container.clientHeight); }); }
    setSize(width, height) {
        this.width = width; this.height = height;
        this.canvas.style.width = `${width}px`; this.canvas.style.height = `${height}px`;
        this.canvas.width = width * this.dpr; this.canvas.height = height * this.dpr;
        this.ctx.scale(this.dpr, this.dpr);
        this.renderCanvas.width = 3840; this.renderCanvas.height = 2160;
        this.requestRender();
    }
    createLayer(id, config = {}) {
        const layer = { id, enabled: true, opacity: 1, blendMode: 'source-over', offset: { x: 0, y: 0 }, scale: 1, rotation: 0, content: null, filters: {}, ...config };
        this.layers.set(id, layer); if (!this.layerOrder.includes(id)) this.layerOrder.push(id); return layer;
    }
    removeLayer(id) { this.layers.delete(id); this.layerOrder = this.layerOrder.filter(l => l !== id); this.requestRender(); }
    setLayerContent(id, content) { const layer = this.layers.get(id); if (layer) { layer.content = content; this.requestRender(); } }
    requestRender() { if (!this.needsRender) { this.needsRender = true; this.renderRAF = requestAnimationFrame(() => this.render()); } }
    render() {
        const startTime = performance.now(); this.ctx.clearRect(0, 0, this.width, this.height);
        for (const layerId of this.layerOrder) {
            const layer = this.layers.get(layerId);
            if (layer && layer.enabled && layer.content) this._renderLayer(layer);
        }
        this.lastFrameTime = performance.now() - startTime; this.frameCount++; if (this.frameCount % 60 === 0) this.fps = Math.round(1000 / this.lastFrameTime); this.needsRender = false;
    }
    _renderLayer(layer) {
        this.ctx.save(); this.ctx.globalAlpha = layer.opacity; this.ctx.globalCompositeOperation = layer.blendMode;
        if (layer.filters && Object.keys(layer.filters).length > 0) this.ctx.filter = this._buildFilterString(layer.filters);
        this.ctx.translate(layer.offset.x, layer.offset.y); this.ctx.scale(layer.scale, layer.scale); this.ctx.rotate(layer.rotation);
        if (layer.content instanceof HTMLImageElement || layer.content instanceof HTMLCanvasElement) this.ctx.drawImage(layer.content, 0, 0);
        else if (typeof layer.content === 'function') layer.content(this.ctx, layer);
        this.ctx.restore();
    }
    _buildFilterString(filters) { const parts = []; if (filters.blur) parts.push(`blur(${filters.blur}px)`); if (filters.brightness) parts.push(`brightness(${filters.brightness})`); if (filters.contrast) parts.push(`contrast(${filters.contrast})`); return parts.join(' ') || 'none'; }
    renderForExport(config = {}) {
        const { width = 3000, height = 2400 } = config;
        this.renderCanvas.width = width; this.renderCanvas.height = height; const ctx = this.renderCtx; ctx.clearRect(0, 0, width, height);
        const scaleX = width / this.width; const scaleY = height / this.height; const scale = Math.max(scaleX, scaleY);
        for (const layerId of this.layerOrder) { const layer = this.layers.get(layerId); if (layer && layer.enabled && layer.content) { ctx.save(); ctx.globalAlpha = layer.opacity; ctx.globalCompositeOperation = layer.blendMode; ctx.translate(layer.offset.x * scale, layer.offset.y * scale); ctx.scale(layer.scale * scale, layer.scale * scale); ctx.rotate(layer.rotation); if (layer.content instanceof HTMLImageElement || layer.content instanceof HTMLCanvasElement) ctx.drawImage(layer.content, 0, 0); else if (typeof layer.content === 'function') layer.content(ctx, layer, width, height); ctx.restore(); } }
        return this.renderCanvas;
    }
    export(format = 'png', quality = 0.95) { return new Promise((resolve) => { const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png'; this.renderCanvas.toBlob((blob) => resolve(blob), mimeType, quality); }); }
    destroy() { if (this.renderRAF) cancelAnimationFrame(this.renderRAF); this.layers.clear(); this.layerOrder = []; }
}