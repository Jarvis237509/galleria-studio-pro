class ExportEngine {
    constructor() {
        this.presetConfigs = {
            marketplace: { name: 'Marketplace Pack', sizes: [{ width: 3000, height: 2400, name: 'hero' }, { width: 1200, height: 1200, name: 'square' }, { width: 800, height: 600, name: 'thumb' }], format: 'jpg-high', quality: 0.95 },
            social: { name: 'Social Media Pack', sizes: [{ width: 1080, height: 1080, name: 'instagram' }, { width: 1080, height: 1920, name: 'story' }, { width: 1200, height: 630, name: 'facebook' }], format: 'jpg-med', quality: 0.9 },
            portfolio: { name: 'Portfolio Pack', sizes: [{ width: 2400, height: 1600, name: 'landscape' }, { width: 1600, height: 2400, name: 'portrait' }], format: 'png', quality: 1.0 },
            print: { name: 'Print Pack', sizes: [{ width: 3600, height: 2400, name: 'a4-landscape' }, { width: 4800, height: 3200, name: 'a3-landscape' }], format: 'png', quality: 1.0 }
        };
        this.formatSettings = { 'png': { mimeType: 'image/png', ext: 'png' }, 'jpg-high': { mimeType: 'image/jpeg', ext: 'jpg', quality: 0.95 }, 'jpg-med': { mimeType: 'image/jpeg', ext: 'jpg', quality: 0.85 } };
    }
    async generatePack(scene, config) {
        const preset = this.presetConfigs[config.preset] || this.presetConfigs.marketplace;
        const format = this.formatSettings[config.format || preset.format];
        const pack = { name: preset.name, generatedAt: new Date().toISOString(), files: [] };
        for (const size of preset.sizes) {
            if (config.selectedSizes && !config.selectedSizes.includes(size.name)) continue;
            const canvas = await this.renderSceneForExport(scene, { width: size.width, height: size.height });
            if (config.watermark && config.watermarkText) this.addWatermark(canvas, config.watermarkText);
            const blob = await this.canvasToBlob(canvas, format.mimeType, format.quality);
            pack.files.push({ name: `${config.filenamePrefix || 'artwork'}-${size.name}.${format.ext}`, size, blob, type: format.mimeType });
        }
        return pack;
    }
    async renderSceneForExport(scene, options) {
        const { width, height } = options; const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
        if (scene.layers) { for (const layer of scene.layers) { await this._renderLayer(ctx, layer, width, height); } }
        return canvas;
    }
    async _renderLayer(ctx, layer, width, height) { ctx.save(); ctx.globalAlpha = layer.opacity || 1; if (layer.blendMode) ctx.globalCompositeOperation = layer.blendMode; if (layer.content instanceof HTMLImageElement || layer.content instanceof HTMLCanvasElement) ctx.drawImage(layer.content, 0, 0, width, height); else if (typeof layer.render === 'function') layer.render(ctx, layer, width, height); ctx.restore(); }
    addWatermark(canvas, text, options = {}) {
        const ctx = canvas.getContext('2d'); const { position = 'bottom-right', opacity = 0.5, fontSize = 24, color = '#ffffff' } = options;
        ctx.save(); ctx.globalAlpha = opacity; ctx.font = `${fontSize}px Inter, sans-serif`; ctx.fillStyle = color; const metrics = ctx.measureText(text); const padding = 30; let x, y;
        switch (position) { case 'top-left': x = padding; y = fontSize + padding; break; case 'top-right': x = canvas.width - metrics.width - padding; y = fontSize + padding; break; case 'bottom-left': x = padding; y = canvas.height - padding; break; default: x = canvas.width - metrics.width - padding; y = canvas.height - padding; }
        ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 4; ctx.fillText(text, x, y); ctx.restore();
    }
    canvasToBlob(canvas, mimeType, quality) { return new Promise((resolve) => { canvas.toBlob((blob) => resolve(blob), mimeType, quality); }); }
    async downloadPack(pack) { for (const file of pack.files) { await this.downloadFile(file.blob, file.name); } }
    downloadFile(blob, filename) { return new Promise((resolve) => { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); setTimeout(resolve, 100); }); }
    getPreset(id) { return this.presetConfigs[id]; }
    getPresets() { return Object.entries(this.presetConfigs).map(([id, config]) => ({ id, ...config })); }
}
const exportEngine = new ExportEngine();