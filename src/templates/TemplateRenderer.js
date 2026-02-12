// TemplateRenderer - Renders template scenes to canvas
class TemplateRenderer {
    constructor() {
        this.cache = new Map();
    }

    async render(template, canvas, artworkImage, config = {}) {
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
        
        // 3. Calculate artwork placement
        const placeholder = template.scene.placeholder;
        const artW = width * placeholder.width * (config.scale || 1);
        const artH = artW / (artworkImage.width / artworkImage.height);
        const artX = width * placeholder.x;
        const artY = height * placeholder.y;
        
        // 4. Render shadow first (behind artwork)
        if (config.frame?.enabled && config.lighting) {
            this._renderShadow(ctx, artX, artY, artW, artH, config.frame, config.lighting, width, height);
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
        
        // Add atmosphere effects
        if (scene.atmosphere?.type === 'smoke') {
            this._renderSmokeAtmosphere(ctx, width, height, scene.atmosphere);
        }
    }
    
    _renderFloor(ctx, template, width, height) {
        const floor = template.scene.floor;
        const floorHeight = height * 0.3;
        const floorY = height - floorHeight;
        
        // Base floor color
        const gradient = ctx.createLinearGradient(0, floorY, 0, height);
        gradient.addColorStop(0, floor.color);
        gradient.addColorStop(1, this._darken(floor.color, 20));
        ctx.fillStyle = gradient;
        ctx.fillRect(0, floorY, width, floorHeight);
        
        // Reflection if enabled
        if (floor.reflection > 0) {
            ctx.save();
            ctx.globalAlpha = floor.reflection * 0.3;
            ctx.scale(1, -1);
            ctx.translate(0, -floorY * 2);
            // Would render artwork reflection here
            ctx.restore();
        }
    }
    
    _renderShadow(ctx, artX, artY, artW, artH, frame, lighting, canvasW, canvasH) {
        const lightPos = lighting.source || { x: 0.5, y: 0.2 };
        const shadow = frameSystem.calculateShadow({
            frameWidth: frame.width * 10,
            frameDepth: frame.depth * 10,
            lightPosition: lightPos,
            shadowSoftness: lighting.shadowSoftness || 0.6
        });
        
        ctx.save();
        ctx.translate(artX, artY);
        
        // Render shadow layers
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
        
        // Create lighting canvas
        const lightCanvas = document.createElement('canvas');
        lightCanvas.width = width;
        lightCanvas.height = height;
        const lctx = lightCanvas.getContext('2d');
        
        // Ambient base
        const tempRGB = lightingEngine.temperatureToRGB(preset.warmth);
        lctx.fillStyle = `rgba(${tempRGB.r}, ${tempRGB.g}, ${tempRGB.b}, ${preset.ambient * (lighting.ambient || 0.3) * 0.3})`;
        lctx.fillRect(0, 0, width, height);
        
        // Key light
        const keyX = (lighting.source?.x || 0.5) * width;
        const keyY = (lighting.source?.y || 0.2) * height;
        const keyGrad = lctx.createRadialGradient(keyX, keyY, 0, keyX, keyY, width * 0.8);
        keyGrad.addColorStop(0, `rgba(${tempRGB.r}, ${tempRGB.g}, ${tempRGB.b}, ${lighting.intensity || 1.0} * 0.4)`);
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
        ctx.globalAlpha = atmosphere.density * 0.3;
        
        // Simple noise-based smoke approximation
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const r = 50 + Math.random() * 100;
            const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
            grad.addColorStop(0, atmosphere.color || '#2a2a3a');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
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