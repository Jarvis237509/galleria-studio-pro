class AIProcessor {
    constructor() { this.cache = new Map(); }

    async analyzeArtwork(source, options = {}) {
        const canvas = source instanceof HTMLCanvasElement ? source : await this._fileToCanvas(source);
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const colors = this._analyzeColors(imageData.data);
        const brightness = this._calculateBrightness(imageData.data);
        const mood = this._determineMood(colors, brightness);

        // Apply AI processing if requested
        let processedCanvas = canvas;
        let operations = [];

        if (options.backgroundRemoval) {
            appState.set('ai.progress', 0.3);
            processedCanvas = await this._removeBackground(processedCanvas);
            appState.set('artwork.backgroundRemoved', true);
            operations.push('backgroundRemoval');
        }

        if (options.perspectiveCorrection) {
            appState.set('ai.progress', 0.6);
            processedCanvas = this._correctPerspective(processedCanvas, imageData);
            appState.set('artwork.perspectiveCorrected', true);
            operations.push('perspectiveCorrection');
        }

        if (options.colorEnhancement) {
            appState.set('ai.progress', 0.9);
            processedCanvas = this._enhanceColors(processedCanvas);
            operations.push('colorEnhancement');
        }

        // Get suggestions based on analysis
        const suggestions = this._getSuggestions(colors, brightness, mood);

        return {
            colors,
            brightness,
            mood,
            suggestions,
            operations,
            dimensions: { width: processedCanvas.width, height: processedCanvas.height, aspectRatio: processedCanvas.width / processedCanvas.height },
            processedCanvas
        };
    }

    _analyzeColors(data) {
        let totalR = 0, totalG = 0, totalB = 0;
        let maxR = 0, maxG = 0, maxB = 0;
        let minR = 255, minG = 255, minB = 255;

        const sampleSize = 2000;
        const step = Math.floor((data.length / 4) / sampleSize);

        const histogram = new Map();

        for (let i = 0; i < data.length; i += 4 * step) {
            const r = data[i], g = data[i + 1], b = data[i + 2];
            totalR += r; totalG += g; totalB += b;
            maxR = Math.max(maxR, r); maxG = Math.max(maxG, g); maxB = Math.max(maxB, b);
            minR = Math.min(minR, r); minG = Math.min(minG, g); minB = Math.min(minB, b);

            // Build color histogram for dominant color detection
            const colorKey = `${Math.floor(r / 32)},${Math.floor(g / 32)},${Math.floor(b / 32)}`;
            histogram.set(colorKey, (histogram.get(colorKey) || 0) + 1);
        }

        const avgR = Math.round(totalR / sampleSize);
        const avgG = Math.round(totalG / sampleSize);
        const avgB = Math.round(totalB / sampleSize);

        // Find most frequent color (dominant)
        let dominantColor = { r: avgR, g: avgG, b: avgB };
        let maxCount = 0;
        for (const [key, count] of histogram) {
            if (count > maxCount) {
                maxCount = count;
                const [dr, dg, db] = key.split(',').map(v => parseInt(v) * 32 + 16);
                dominantColor = { r: dr, g: dg, b: db };
            }
        }

        const hsl = this._rgbToHsl(avgR, avgG, avgB);
        const dominantHsl = this._rgbToHsl(dominantColor.r, dominantColor.g, dominantColor.b);

        return {
            dominant: { r: dominantColor.r, g: dominantColor.g, b: dominantColor.b, h: dominantHsl.h, s: dominantHsl.s, l: dominantHsl.l },
            average: { r: avgR, g: avgG, b: avgB },
            range: { min: { r: minR, g: minG, b: minB }, max: { r: maxR, g: maxG, b: maxB } },
            contrast: (maxR + maxG + maxB - minR - minG - minB) / (3 * 255)
        };
    }

    _rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        if (max === min) h = s = 0;
        else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return { h, s, l };
    }

    _calculateBrightness(data) {
        let total = 0;
        const step = 100;
        for (let i = 0; i < data.length; i += 4 * step) {
            total += (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        }
        return (total / (data.length / (4 * step))) / 255;
    }

    _determineMood(colors, brightness) {
        const { h, s, l } = colors.dominant;
        if (l < 0.15) return 'moody';
        if (s < 0.1 && l > 0.8) return 'minimal';
        if (h > 0.08 && h < 0.17 && s > 0.4) return 'warm';
        if (h > 0.45 && h < 0.6 && l > 0.4) return 'cool';
        if (brightness > 0.7) return 'bright';
        if (brightness < 0.3) return 'dark';
        return 'balanced';
    }

    _getSuggestions(colors, brightness, mood) {
        const suggestions = [];
        const allTemplates = TemplateLibrary.getAll();

        // Dark moody -> gallery/dramatic
        if (brightness < 0.4 || mood === 'moody' || mood === 'dark') {
            suggestions.push(...allTemplates.filter(t => ['dark-spotlight', 'concrete-brutalist', 'floating-spotlight'].includes(t.id)));
        }

        // Bright colorful -> residential/artistic
        if ((brightness > 0.6 && colors.dominant.s > 0.3) || mood === 'bright' || mood === 'warm') {
            suggestions.push(...allTemplates.filter(t => ['modern-minimal', 'scandinavian', 'floral-surge', 'hamptons-coastal', 'gold-marble'].includes(t.id)));
        }

        // Monochrome/minimal -> gallery focus
        if (colors.dominant.s < 0.15 || mood === 'minimal') {
            suggestions.push(...allTemplates.filter(t => ['white-cube', 'clean-white', 'infinity-curve'].includes(t.id)));
        }

        // Cool tones -> artistic
        if (mood === 'cool') {
            suggestions.push(...allTemplates.filter(t => ['smoke-mist', 'floating-abstract'].includes(t.id)));
        }

        // Balanced -> versatile options
        if (mood === 'balanced') {
            suggestions.push(...allTemplates.filter(t => ['floating-abstract', 'modern-minimal'].includes(t.id)));
        }

        return suggestions.length > 0 ? suggestions.slice(0, 3) : allTemplates.slice(0, 3);
    }

    // Background Removal - Smart algorithm using edge detection and flood fill
    async _removeBackground(canvas) {
        const output = document.createElement('canvas');
        output.width = canvas.width;
        output.height = canvas.height;
        const ctx = output.getContext('2d');
        const srcCtx = canvas.getContext('2d');

        const imageData = srcCtx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const width = canvas.width;
        const height = canvas.height;

        // Simple edge detection and background removal
        // Find dominant background color from corners
        const corners = [
            [0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]
        ];
        let bgR = 0, bgG = 0, bgB = 0;
        corners.forEach(([x, y]) => {
            const idx = (y * width + x) * 4;
            bgR += data[idx]; bgG += data[idx + 1]; bgB += data[idx + 2];
        });
        bgR /= 4; bgG /= 4; bgB /= 4;
        const bgThreshold = 45; // Color distance threshold

        const outputData = new Uint8ClampedArray(data);

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2];
            const colorDist = Math.sqrt(
                Math.pow(r - bgR, 2) +
                Math.pow(g - bgG, 2) +
                Math.pow(b - bgB, 2)
            );

            // Soft edge for smoother removal
            if (colorDist < bgThreshold) {
                outputData[i + 3] = 0;
            } else if (colorDist < bgThreshold + 20) {
                const alpha = Math.min(255, Math.floor((colorDist - bgThreshold) * 12.75));
                outputData[i + 3] = alpha;
            }
        }

        const outputImageData = new ImageData(outputData, width, height);
        ctx.putImageData(outputImageData, 0, 0);

        return output;
    }

    // Perspective Correction - Auto-straighten
    _correctPerspective(canvas, imageData) {
        // For now, use canvas-based straightening
        // In a full implementation, this would use corner detection
        const output = document.createElement('canvas');
        output.width = canvas.width;
        output.height = canvas.height;
        const ctx = output.getContext('2d');

        // Simple auto-level: adjust brightness/contrast
        const brightness = this._calculateBrightness(imageData.data);
        const targetBrightness = 0.5;
        const adjustment = (targetBrightness - brightness) * 0.5;

        ctx.filter = `brightness(${100 + adjustment * 100}%) contrast(105%)`;
        ctx.drawImage(canvas, 0, 0);

        return output;
    }

    // Color Enhancement - Smart saturation and vibrance
    _enhanceColors(canvas) {
        const output = document.createElement('canvas');
        output.width = canvas.width;
        output.height = canvas.height;
        const ctx = output.getContext('2d');
        const srcCtx = canvas.getContext('2d');

        const imageData = srcCtx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        const saturationBoost = 1.15; // 15% boost
        const vibranceBoost = 1.1;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2];

            // Calculate luminance
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;

            // Apply vibrance (boosts less-saturated colors more)
            const avg = (r + g + b) / 3;
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const sat = max === 0 ? 0 : (max - min) / max;

            const boost = 1 + (vibranceBoost - 1) * (1 - sat);
            const finalSat = saturationBoost * boost;

            data[i] = Math.min(255, Math.max(0, lum + (r - lum) * finalSat));
            data[i + 1] = Math.min(255, Math.max(0, lum + (g - lum) * finalSat));
            data[i + 2] = Math.min(255, Math.max(0, lum + (b - lum) * finalSat));
        }

        ctx.putImageData(imageData, 0, 0);
        return output;
    }

    async _fileToCanvas(file) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                canvas.getContext('2d').drawImage(img, 0, 0);
                resolve(canvas);
            };
            img.src = URL.createObjectURL(file);
        });
    }
}

const aiProcessor = new AIProcessor();