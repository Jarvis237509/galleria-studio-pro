class TemplateRenderer {
    constructor() { this.cache = new Map(); }

    async render(template, canvas, artworkImage, config = {}) {
        // Set canvas size based on template resolution
        const targetWidth = template.baseResolution?.width || 1920;
        const targetHeight = template.baseResolution?.height || 1080;

        // Scale down for display if needed
        const maxDisplayWidth = 1200;
        const scale = targetWidth > maxDisplayWidth ? maxDisplayWidth / targetWidth : 1;
        canvas.width = targetWidth * scale;
        canvas.height = targetHeight * scale;

        const ctx = canvas.getContext('2d');
        const { width, height } = canvas;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // 1. Render background
        this._renderBackground(ctx, template, width, height);

        // 2. Render floor if exists
        if (template.scene.floor) {
            this._renderFloor(ctx, template, width, height);
        }

        // 3. Calculate artwork placement from template placeholder
        const placeholder = template.scene.placeholder;
        const baseW = width * placeholder.width;
        const baseH = baseW / (artworkImage.width / artworkImage.height);
        const artW = baseW * (config.scale || 1);
        const artH = baseH * (config.scale || 1);
        const artX = width * placeholder.x;
        const artY = height * placeholder.y;

        // 4. Render shadow first (behind artwork)
        if (config.frame?.enabled && config.lighting) {
            this._renderShadow(ctx, artX, artY, artW, artH, config.frame, config.lighting);
        }

        // 5. Render frame if enabled
        if (config.frame?.enabled && config.frame.style !== 'none') {
            frameSystem.renderFrame(ctx, {
                width: artW,
                height: artH,
                frameStyle: config.frame.style,
                frameWidth: config.frame.width * 10,
                frameDepth: config.frame.depth * 10,
                frameColor: config.frame.color,
                matting: config.frame.matting * 10,
                lightPosition: config.lighting?.source || { x: 0.5, y: 0.2 }
            });
        }

        // 6. Render artwork
        ctx.save();
        ctx.translate(artX, artY);
        if (config.rotation) {
            ctx.rotate((config.rotation * Math.PI) / 180);
        }
        ctx.drawImage(artworkImage, -artW/2, -artH/2, artW, artH);
        ctx.restore();

        // 7. Render lighting overlay
        if (config.lighting) {
            this._renderLightingOverlay(ctx, config.lighting, width, height);
        }

        return canvas;
    }

    async renderForExport(template, artworkImage, config = {}, targetWidth = 3000) {
        const aspectRatio = (template.baseResolution?.width || 3000) / (template.baseResolution?.height || 2400);
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetWidth / aspectRatio;
        return this.render(template, canvas, artworkImage, config);
    }

    _renderBackground(ctx, template, width, height) {
        const scene = template.scene;

        if (scene.backgroundGradient) {
            const angle = scene.backgroundGradient.angle || 135;
            const rad = (angle * Math.PI) / 180;
            const dx = Math.cos(rad) * width;
            const dy = Math.sin(rad) * height;
            const gradient = ctx.createLinearGradient(0, 0, dx, dy);
            gradient.addColorStop(0, scene.backgroundGradient.from);
            gradient.addColorStop(1, scene.backgroundGradient.to);
            ctx.fillStyle = gradient;
        } else {
            ctx.fillStyle = scene.background || '#1a1a1a';
        }
        ctx.fillRect(0, 0, width, height);

        if (scene.atmosphere?.type === 'smoke') {
            this._renderSmokeAtmosphere(ctx, width, height, scene.atmosphere);
        }
    }

    _renderFloor(ctx, template, width, height) {
        const floor = template.scene.floor;
        const floorHeight = height * 0.3;
        const floorY = height - floorHeight;
        const gradient = ctx.createLinearGradient(0, floorY, 0, height);
        gradient.addColorStop(0, floor.color);
        gradient.addColorStop(1, this._darken(floor.color, 20));
        ctx.fillStyle = gradient;
        ctx.fillRect(0, floorY, width, floorHeight);
    }

    _renderShadow(ctx, artX, artY, artW, artH, frame, lighting) {
        const lightPos = lighting.source || { x: 0.5, y: 0.2 };
        const shadow = frameSystem.calculateShadow({
            frameWidth: frame.width * 10,
            frameDepth: frame.depth * 10,
            lightPosition: lightPos,
            shadowSoftness: lighting.shadowSoftness || 0.6
        });

        ctx.save();
        ctx.translate(artX, artY);

        shadow.layers.forEach(layer => {
            ctx.shadowColor = `rgba(0,0,0,${layer.opacity})`;
            ctx.shadowBlur = layer.blur;
            ctx.shadowOffsetX = shadow.direction.x * shadow.length * layer.offset;
            ctx.shadowOffsetY = shadow.direction.y * shadow.length * layer.offset;
            ctx.fillStyle = 'transparent';
            ctx.fillRect(-artW/2 - 10, -artH/2 - 10, artW + 20, artH + 20);
        });

        ctx.restore();
    }

    _renderLightingOverlay(ctx, lighting, width, height) {
        const mood = lighting.mood || 'gallery';
        const preset = lightingEngine.getMoodPreset(mood);
        const tempRGB = lightingEngine.temperatureToRGB(preset.warmth);

        const lightCanvas = document.createElement('canvas');
        lightCanvas.width = width;
        lightCanvas.height = height;
        const lctx = lightCanvas.getContext('2d');

        // Ambient base
        const ambientAlpha = preset.ambient * (lighting.ambient || 0.3) * 0.3;
        lctx.fillStyle = `rgba(${tempRGB.r}, ${tempRGB.g}, ${tempRGB.b}, ${ambientAlpha})`;
        lctx.fillRect(0, 0, width, height);

        // Key light
        const keyX = (lighting.source?.x || 0.5) * width;
        const keyY = (lighting.source?.y || 0.2) * height;
        const keyGrad = lctx.createRadialGradient(keyX, keyY, 0, keyX, keyY, width * 0.8);
        const intensity = (lighting.intensity || 1.0) * 0.4;
        keyGrad.addColorStop(0, `rgba(${tempRGB.r}, ${tempRGB.g}, ${tempRGB.b}, ${intensity})`);
        keyGrad.addColorStop(1, 'rgba(0,0,0,0)');
        lctx.globalCompositeOperation = 'screen';
        lctx.fillStyle = keyGrad;
        lctx.fillRect(0, 0, width, height);

        // Apply to main canvas
        ctx.save();
        ctx.globalCompositeOperation = 'soft-light';
        ctx.drawImage(lightCanvas, 0, 0);
        ctx.restore();
    }

    _renderSmokeAtmosphere(ctx, width, height, atmosphere) {
        ctx.save();
        ctx.globalAlpha = (atmosphere.density || 0.4) * 0.3;
        ctx.fillStyle = atmosphere.color || '#2a2a3a';

        for (let i = 0; i < 20; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const r = 50 + Math.random() * 100;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    _darken(color, percent) {
        if (!color || !color.startsWith('#')) return color;
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, (num >> 16) - amt);
        const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
        const B = Math.max(0, (num & 0x0000FF) - amt);
        return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
    }
}

const templateRenderer = new TemplateRenderer();