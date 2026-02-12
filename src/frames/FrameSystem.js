class FrameSystem {
    constructor() {
        this.frameStyles = {
            'minimal-white': { name: 'Minimal White', material: 'matte', defaultColor: '#ffffff' },
            'minimal-black': { name: 'Minimal Black', material: 'matte', defaultColor: '#1a1a1a' },
            'natural-oak': { name: 'Natural Oak', material: 'wood', texture: 'oak', defaultColor: '#c4a77d' },
            'walnut': { name: 'Walnut', material: 'wood', texture: 'walnut', defaultColor: '#5d4e37' },
            'brushed-gold': { name: 'Brushed Gold', material: 'metal', finish: 'brushed', defaultColor: '#d4af37', reflection: 0.5 },
            'silver': { name: 'Silver', material: 'metal', finish: 'polished', defaultColor: '#c0c0c0', reflection: 0.7 },
            'matte-brass': { name: 'Matte Brass', material: 'metal', finish: 'matte', defaultColor: '#b5a642', reflection: 0.3 },
            'gallery-float': { name: 'Gallery Float', material: 'float', minimal: true, spacer: 0.5 },
            'shadow-box': { name: 'Shadow Box', material: 'box', depth: 5 },
            'acrylic': { name: 'Acrylic Face', material: 'acrylic', gloss: 0.9, reflection: 0.8 },
            'none': { name: 'No Frame', material: 'none' }
        };
    }

    // Calculate realistic shadow for frame based on light position
    calculateShadow(params) {
        const { frameDepth, lightPosition, shadowSoftness = 0.6 } = params;

        // Shadow direction from light
        const shadowDir = {
            x: (lightPosition.x - 0.5) * -2,
            y: (lightPosition.y - 0.5) * -2 + 0.5
        };

        // Shadow length based on frame depth
        const shadowLength = frameDepth * 2;

        // Calculate shadow blur based on softness and distance
        const blur = shadowSoftness * 20 + frameDepth * 5;

        // Shadow opacity decreases with distance
        const opacity = Math.max(0.1, 0.4 - frameDepth * 0.04);

        // Multiple shadow layers for realism (umbra + penumbra)
        return {
            direction: shadowDir,
            length: shadowLength,
            blur,
            opacity,
            layers: [
                { offset: 0.3, blur: blur * 0.5, opacity: opacity * 0.8 },
                { offset: 0.7, blur: blur * 1.0, opacity: opacity * 0.5 },
                { offset: 1.2, blur: blur * 1.5, opacity: opacity * 0.2 }
            ]
        };
    }

    // Generate frame canvas with realistic shading
    renderFrame(ctx, config) {
        const {
            width, height, frameStyle, frameWidth, frameDepth,
            frameColor, matting, lightPosition
        } = config;

        const style = this.frameStyles[frameStyle] || this.frameStyles['minimal-white'];
        const fw = frameWidth || 30;
        const fd = frameDepth || 15;

        // Calculate dimensions
        const outerW = width + (fw * 2);
        const outerH = height + (fw * 2);
        const mattingWidth = matting || 0;
        const innerW = outerW - (mattingWidth * 2);
        const innerH = outerH - (mattingWidth * 2);

        ctx.save();
        ctx.translate(width / 2, height / 2);

        // Render frame based on style
        switch (style.material) {
            case 'wood':
                this._renderWoodFrame(ctx, { outerW, outerH, innerW, innerH, frameColor: frameColor || style.defaultColor });
                break;
            case 'metal':
                this._renderMetalFrame(ctx, { outerW, outerH, innerW, innerH, frameColor: frameColor || style.defaultColor, lightPosition });
                break;
            case 'matte':
                this._renderMatteFrame(ctx, { outerW, outerH, innerW, innerH, frameColor: frameColor || style.defaultColor });
                break;
            case 'float':
                this._renderFloatFrame(ctx, { width, height });
                break;
            case 'box':
                this._renderShadowBox(ctx, { outerW, outerH, width, height, frameColor });
                break;
            case 'acrylic':
                this._renderAcrylicFrame(ctx, { outerW, outerH, innerW, innerH, fw, fd });
                break;
        }

        // Render matting if present
        if (mattingWidth > 0 && style.material !== 'float') {
            this._renderMatting(ctx, { outerW, outerH, innerW, innerH, width, height, mattingWidth });
        }

        ctx.restore();
    }

    _renderWoodFrame(ctx, { outerW, outerH, innerW, innerH, frameColor }) {
        const gradient = ctx.createLinearGradient(-outerW / 2, -outerH / 2, outerW / 2, outerH / 2);
        gradient.addColorStop(0, frameColor);
        gradient.addColorStop(0.5, this._lighten(frameColor, 5));
        gradient.addColorStop(1, this._darken(frameColor, 10));
        ctx.fillStyle = gradient;
        ctx.fillRect(-outerW / 2, -outerH / 2, outerW, outerH);
        ctx.clearRect(-innerW / 2, -innerH / 2, innerW, innerH);
    }

    _renderMetalFrame(ctx, { outerW, outerH, innerW, innerH, frameColor, lightPosition }) {
        const lightX = lightPosition ? (lightPosition.x - 0.5) * outerW : 0;
        const lightY = lightPosition ? (lightPosition.y - 0.5) * outerH : 0;
        const gradient = ctx.createRadialGradient(lightX, lightY, 0, 0, 0, outerW);
        const highlight = this._lighten(frameColor, 30);
        const mid = frameColor;
        const shadow = this._darken(frameColor, 20);
        gradient.addColorStop(0, highlight);
        gradient.addColorStop(0.3, mid);
        gradient.addColorStop(0.6, highlight);
        gradient.addColorStop(1, shadow);
        ctx.fillStyle = gradient;
        ctx.fillRect(-outerW / 2, -outerH / 2, outerW, outerH);
        ctx.clearRect(-innerW / 2, -innerH / 2, innerW, innerH);
    }

    _renderMatteFrame(ctx, { outerW, outerH, innerW, innerH, frameColor }) {
        ctx.fillStyle = frameColor;
        ctx.fillRect(-outerW / 2, -outerH / 2, outerW, outerH);
        ctx.clearRect(-innerW / 2, -innerH / 2, innerW, innerH);
        ctx.strokeStyle = this._darken(frameColor, 5);
        ctx.lineWidth = 1;
        ctx.strokeRect(-outerW / 2 + 0.5, -outerH / 2 + 0.5, outerW - 1, outerH - 1);
    }

    _renderFloatFrame(ctx, { width, height }) {
        const spacerSize = 5;
        ctx.fillStyle = '#333';
        ctx.fillRect(-width / 2 - spacerSize, -height / 2 - spacerSize / 2, width + spacerSize * 2, spacerSize / 2);
        ctx.fillRect(-width / 2 - spacerSize, height / 2, width + spacerSize * 2, spacerSize / 2);
    }

    _renderShadowBox(ctx, { outerW, outerH, width, height, frameColor }) {
        ctx.fillStyle = frameColor || '#1a1a1a';
        ctx.fillRect(-outerW / 2, -outerH / 2, outerW, outerH);
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(-width / 2, -height / 2, width, height);
    }

    _renderAcrylicFrame(ctx, { outerW, outerH, innerW, innerH }) {
        ctx.fillStyle = 'rgba(240, 248, 255, 0.3)';
        ctx.fillRect(-outerW / 2, -outerH / 2, outerW, outerH);
        ctx.clearRect(-innerW / 2, -innerH / 2, innerW, innerH);
    }

    _renderMatting(ctx, { outerW, outerH, innerW, innerH, width, height, mattingWidth }) {
        const matColor = '#f5f5f0';
        ctx.fillStyle = matColor;
        ctx.fillRect(-innerW / 2, -innerH / 2, (innerW - width) / 2, innerH);
        ctx.fillRect(width / 2, -innerH / 2, (innerW - width) / 2, innerH);
        ctx.fillRect(-width / 2, -innerH / 2, width, (innerH - height) / 2);
        ctx.fillRect(-width / 2, height / 2, width, (innerH - height) / 2);
        ctx.strokeStyle = this._darken(matColor, 10);
        ctx.lineWidth = 1;
        ctx.strokeRect(-width / 2, -height / 2, width, height);
    }

    _lighten(color, percent) {
        if (!color) return color;
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
    }

    _darken(color, percent) {
        if (!color) return color;
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, (num >> 16) - amt);
        const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
        const B = Math.max(0, (num & 0x0000FF) - amt);
        return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
    }

    getStyles() { return Object.entries(this.frameStyles).map(([id, style]) => ({ id, ...style })); }
    getStyle(id) { return this.frameStyles[id] || this.frameStyles['minimal-white']; }
}

const frameSystem = new FrameSystem();