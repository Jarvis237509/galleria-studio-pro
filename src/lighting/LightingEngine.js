class LightingEngine {
    constructor() {
        this.moodPresets = {
            morning: { ambient: 0.5, warmth: 4500, key: { intensity: 0.7 }, fill: 0.4, shadow: { softness: 0.5, opacity: 0.3 } },
            daylight: { ambient: 0.7, warmth: 5500, key: { intensity: 0.9 }, fill: 0.5, shadow: { softness: 0.4, opacity: 0.25 } },
            gallery: { ambient: 0.35, warmth: 3500, key: { intensity: 1.0 }, fill: 0.2, shadow: { softness: 0.6, opacity: 0.4 } },
            golden: { ambient: 0.45, warmth: 3200, key: { intensity: 0.8 }, fill: 0.3, shadow: { softness: 0.7, opacity: 0.35 } },
            evening: { ambient: 0.2, warmth: 2700, key: { intensity: 0.6 }, fill: 0.15, shadow: { softness: 0.8, opacity: 0.45 } }
        };
        this.temperatureCache = new Map();
    }
    calculateSceneLighting(config) {
        const { mood = 'gallery', lightSource = { x: 0.5, y: 0.2 }, intensity = 1.0, ambient = 0.3 } = config;
        const preset = this.moodPresets[mood] || this.moodPresets.gallery;
        const keyLight = { position: lightSource, intensity: preset.key.intensity * intensity, warmth: preset.warmth, color: this.temperatureToRGB(preset.warmth), angle: preset.key.angle };
        const fillLight = { position: { x: 1 - lightSource.x, y: lightSource.y + 0.2 }, intensity: preset.fill * intensity, warmth: preset.warmth + 500, color: this.temperatureToRGB(preset.warmth + 500) };
        const ambientLight = { intensity: preset.ambient * ambient, color: { r: 255, g: 255, b: 255 } };
        const shadows = this.calculateShadows({ lightSource, softness: preset.shadow.softness, opacity: preset.shadow.opacity });
        const reflections = { floor: { enabled: true, opacity: 0.3 }, frame: { enabled: true, highlights: [{ x: lightSource.x, y: lightSource.y, intensity: 0.5 }] } };
        return { key: keyLight, fill: fillLight, ambient: ambientLight, shadows, reflections };
    }
    calculateShadows({ lightSource, softness, opacity }) {
        const shadowDir = { x: (lightSource.x - 0.5) * -2, y: (lightSource.y - 0.5) * -2 + 0.5 };
        const blur = softness * 20;
        return { direction: shadowDir, length: 20, blur, opacity, layers: [{ offset: 0.3, blur: blur * 0.5, opacity: opacity * 0.8 }, { offset: 0.7, blur: blur * 1.0, opacity: opacity * 0.5 }, { offset: 1.2, blur: blur * 1.5, opacity: opacity * 0.2 }] };
    }
    temperatureToRGB(kelvin) {
        if (this.temperatureCache.has(kelvin)) return this.temperatureCache.get(kelvin);
        let r, g, b; const temp = kelvin / 100;
        if (temp <= 66) { r = 255; g = temp; g = 99.4708025861 * Math.log(g) - 161.1195681661; if (temp <= 19) b = 0; else { b = temp - 10; b = 138.5177312231 * Math.log(b) - 305.0447927307; } } else { r = temp - 60; r = 329.698727446 * Math.pow(r, -0.1332047592); g = temp - 60; g = 288.1221695283 * Math.pow(g, -0.0755148492); b = 255; }
        const result = { r: Math.max(0, Math.min(255, Math.round(r))), g: Math.max(0, Math.min(255, Math.round(g))), b: Math.max(0, Math.min(255, Math.round(b))) };
        this.temperatureCache.set(kelvin, result); return result;
    }
    applyLighting(ctx, lighting, sceneDims) {
        const { width, height } = sceneDims; const lightCanvas = document.createElement('canvas'); lightCanvas.width = width; lightCanvas.height = height; const lightCtx = lightCanvas.getContext('2d');
        const ambientColor = lighting.ambient.color; const ambientAlpha = lighting.ambient.intensity; lightCtx.fillStyle = `rgba(${ambientColor.r}, ${ambientColor.g}, ${ambientColor.b}, ${ambientAlpha * 0.3})`; lightCtx.fillRect(0, 0, width, height);
        const key = lighting.key; const keyX = key.position.x * width; const keyY = key.position.y * height; const keyRadius = Math.max(width, height) * 0.8; const keyGrad = lightCtx.createRadialGradient(keyX, keyY, 0, keyX, keyY, keyRadius); keyGrad.addColorStop(0, `rgba(${key.color.r}, ${key.color.g}, ${key.color.b}, ${key.intensity * 0.5})`); keyGrad.addColorStop(0.5, `rgba(${key.color.r}, ${key.color.g}, ${key.color.b}, ${key.intensity * 0.2})`); keyGrad.addColorStop(1, 'rgba(0,0,0,0)'); lightCtx.globalCompositeOperation = 'screen'; lightCtx.fillStyle = keyGrad; lightCtx.fillRect(0, 0, width, height); lightCtx.globalCompositeOperation = 'source-over';
        const fill = lighting.fill; const fillX = fill.position.x * width; const fillY = fill.position.y * height; const fillGrad = lightCtx.createRadialGradient(fillX, fillY, 0, fillX, fillY, keyRadius * 0.7); fillGrad.addColorStop(0, `rgba(${fill.color.r}, ${fill.color.g}, ${fill.color.b}, ${fill.intensity * 0.3})`); fillGrad.addColorStop(1, 'rgba(0,0,0,0)'); lightCtx.fillStyle = fillGrad; lightCtx.fillRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'soft-light'; ctx.drawImage(lightCanvas, 0, 0, width, height); ctx.globalCompositeOperation = 'source-over';
    }
    getMoods() { return Object.keys(this.moodPresets); }
    getMoodPreset(mood) { return this.moodPresets[mood] || this.moodPresets.gallery; }
}
const lightingEngine = new LightingEngine();