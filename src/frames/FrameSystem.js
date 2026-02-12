class FrameSystem {
    constructor() {
        this.frameStyles = { 'minimal-white': { name: 'Minimal White', material: 'matte', defaultColor: '#ffffff' }, 'minimal-black': { name: 'Minimal Black', material: 'matte', defaultColor: '#1a1a1a' }, 'natural-oak': { name: 'Natural Oak', material: 'wood', texture: 'oak', defaultColor: '#c4a77d' }, 'walnut': { name: 'Walnut', material: 'wood', texture: 'walnut', defaultColor: '#5d4e37' }, 'brushed-gold': { name: 'Brushed Gold', material: 'metal', finish: 'brushed', defaultColor: '#d4af37', reflection: 0.5 }, 'silver': { name: 'Silver', material: 'metal', finish: 'polished', defaultColor: '#c0c0c0', reflection: 0.7 }, 'gallery-float': { name: 'Gallery Float', material: 'float', minimal: true }, 'none': { name: 'No Frame', material: 'none' } };
    }
    calculateShadow(params) {
        const { frameDepth, lightPosition, shadowSoftness = 0.6 } = params;
        const shadowDir = { x: (lightPosition.x - 0.5) * -2, y: (lightPosition.y - 0.5) * -2 + 0.5 };
        const shadowLength = frameDepth * 2; const blur = shadowSoftness * 20 + frameDepth * 5; const opacity = Math.max(0.1, 0.4 - frameDepth * 0.04);
        return { direction: shadowDir, length: shadowLength, blur, opacity, layers: [{ offset: 0.3, blur: blur * 0.5, opacity: opacity * 0.6 }, { offset: 0.7, blur: blur * 1.0, opacity: opacity * 0.4 }, { offset: 1.2, blur: blur * 1.5, opacity: opacity * 0.2 }] };
    }
    renderFrame(ctx, config) {
        const { width, height, frameStyle, frameWidth, frameDepth, frameColor, matting, lightPosition } = config;
        const style = this.frameStyles[frameStyle] || this.frameStyles['minimal-white']; const fw = (frameWidth || 3) * 10; const fd = (frameDepth || 1.5) * 10;
        const outerW = width + fw * 2; const outerH = height + fw * 2; const mattingWidth = (matting || 0) * 10; const innerW = outerW - mattingWidth * 2; const innerH = outerH - mattingWidth * 2;
        ctx.save(); ctx.translate(width / 2, height / 2);
        if (style.material === 'wood') this._renderWoodFrame(ctx, { outerW, outerH, innerW, innerH, frameColor: frameColor || style.defaultColor });
        else if (style.material === 'metal') this._renderMetalFrame(ctx, { outerW, outerH, innerW, innerH, frameColor: frameColor || style.defaultColor });
        else if (style.material === 'matte') this._renderMatteFrame(ctx, { outerW, outerH, innerW, innerH, frameColor: frameColor || style.defaultColor });
        else if (style.material === 'float') this._renderFloatFrame(ctx, { width, height });
        if (mattingWidth > 0) this._renderMatting(ctx, { outerW, outerH, innerW, innerH, width, height, mattingWidth });
        ctx.restore();
    }
    _renderWoodFrame(ctx, { outerW, outerH, innerW, innerH, frameColor }) { const gradient = ctx.createLinearGradient(-outerW / 2, -outerH / 2, outerW / 2, outerH / 2); gradient.addColorStop(0, frameColor); gradient.addColorStop(0.5, this._lighten(frameColor, 5)); gradient.addColorStop(1, this._darken(frameColor, 10)); ctx.fillStyle = gradient; ctx.fillRect(-outerW / 2, -outerH / 2, outerW, outerH); ctx.clearRect(-innerW / 2, -innerH / 2, innerW, innerH); }
    _renderMetalFrame(ctx, { outerW, outerH, innerW, innerH, frameColor }) { const gradient = ctx.createLinearGradient(-outerW / 2, 0, outerW / 2, 0); gradient.addColorStop(0, this._lighten(frameColor, 30)); gradient.addColorStop(0.3, frameColor); gradient.addColorStop(0.6, this._lighten(frameColor, 30)); gradient.addColorStop(1, this._darken(frameColor, 20)); ctx.fillStyle = gradient; ctx.fillRect(-outerW / 2, -outerH / 2, outerW, outerH); ctx.clearRect(-innerW / 2, -innerH / 2, innerW, innerH); }
    _renderMatteFrame(ctx, { outerW, outerH, innerW, innerH, frameColor }) { ctx.fillStyle = frameColor; ctx.fillRect(-outerW / 2, -outerH / 2, outerW, outerH); ctx.clearRect(-innerW / 2, -innerH / 2, innerW, innerH); ctx.strokeStyle = this._darken(frameColor, 5); ctx.lineWidth = 1; ctx.strokeRect(-outerW / 2 + 0.5, -outerH / 2 + 0.5, outerW - 1, outerH - 1); }
    _renderFloatFrame(ctx, { width, height }) { const spacerSize = 5; ctx.fillStyle = '#333'; ctx.fillRect(-width / 2 - spacerSize, -height / 2 - spacerSize / 2, width + spacerSize * 2, spacerSize / 2); ctx.fillRect(-width / 2 - spacerSize, height / 2, width + spacerSize * 2, spacerSize / 2); }
    _renderMatting(ctx, { outerW, outerH, innerW, innerH, width, height, mattingWidth }) { const matColor = '#f5f5f0'; ctx.fillStyle = matColor; ctx.fillRect(-innerW / 2, -innerH / 2, (innerW - width) / 2, innerH); ctx.fillRect(width / 2, -innerH / 2, (innerW - width) / 2, innerH); ctx.fillRect(-width / 2, -innerH / 2, width, (innerH - height) / 2); ctx.fillRect(-width / 2, height / 2, width, (innerH - height) / 2); ctx.strokeStyle = this._darken(matColor, 10); ctx.lineWidth = 1; ctx.strokeRect(-width / 2, -height / 2, width, height); }
    _lighten(color, percent) { const num = parseInt(color.replace('#', ''), 16); const amt = Math.round(2.55 * percent); const R = Math.min(255, (num >> 16) + amt); const G = Math.min(255, ((num >> 8) & 0x00FF) + amt); const B = Math.min(255, (num & 0x0000FF) + amt); return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`; }
    _darken(color, percent) { const num = parseInt(color.replace('#', ''), 16); const amt = Math.round(2.55 * percent); const R = Math.max(0, (num >> 16) - amt); const G = Math.max(0, ((num >> 8) & 0x00FF) - amt); const B = Math.max(0, (num & 0x0000FF) - amt); return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`; }
    getStyles() { return Object.entries(this.frameStyles).map(([id, style]) => ({ id, ...style })); }
    getStyle(id) { return this.frameStyles[id] || this.frameStyles['minimal-white']; }
}
const frameSystem = new FrameSystem();