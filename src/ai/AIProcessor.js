class AIProcessor {
    constructor() { this.cache = new Map(); }

    async analyzeArtwork(source) {
        const canvas = source instanceof HTMLCanvasElement ? source : await this._fileToCanvas(source);
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const colors = this._analyzeColors(imageData.data);
        const brightness = this._calculateBrightness(imageData.data);
        const mood = this._determineMood(colors, brightness);

        // Get suggestions based on analysis
        const suggestions = this._getSuggestions(colors, brightness, mood);

        return { colors, brightness, mood, suggestions, dimensions: { width: canvas.width, height: canvas.height, aspectRatio: canvas.width / canvas.height } };
    }

    _analyzeColors(data) {
        let totalR = 0, totalG = 0, totalB = 0;
        const sampleSize = 1000;
        const step = Math.floor((data.length / 4) / sampleSize);

        for (let i = 0; i < data.length; i += 4 * step) {
            totalR += data[i];
            totalG += data[i + 1];
            totalB += data[i + 2];
        }

        const avgR = Math.round(totalR / sampleSize);
        const avgG = Math.round(totalG / sampleSize);
        const avgB = Math.round(totalB / sampleSize);
        const hsl = this._rgbToHsl(avgR, avgG, avgB);

        return {
            dominant: { r: avgR, g: avgG, b: avgB, h: hsl.h, s: hsl.s, l: hsl.l },
            average: { r: avgR, g: avgG, b: avgB }
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
        if (l < 0.2) return 'moody';
        if (s < 0.1 && l > 0.8) return 'minimal';
        if (h > 0.15 && h < 0.17 && s > 0.5) return 'warm';
        if (h > 0.5 && h < 0.7 && l > 0.5) return 'cool';
        if (brightness > 0.7) return 'bright';
        return 'balanced';
    }

    _getSuggestions(colors, brightness, mood) {
        const suggestions = [];
        const allTemplates = TemplateLibrary.getAll();

        // Dark moody -> gallery/dramatic
        if (brightness < 0.4) {
            suggestions.push(...allTemplates.filter(t => ['dark-spotlight', 'concrete-brutalist', 'floating-spotlight'].includes(t.id)));
        }

        // Bright colorful -> residential/artistic
        if (brightness > 0.6 && colors.dominant.s > 0.3) {
            suggestions.push(...allTemplates.filter(t => ['modern-minimal', 'scandinavian', 'floral-surge'].includes(t.id)));
        }

        // Monochrome -> gallery focus
        if (colors.dominant.s < 0.2) {
            suggestions.push(...allTemplates.filter(t => ['white-cube', 'floating-spotlight'].includes(t.id)));
        }

        // Warm tones -> artistic
        if (colors.dominant.h > 0.15 && colors.dominant.h < 0.5) {
            suggestions.push(...allTemplates.filter(t => ['hamptons-coastal', 'gold-marble'].includes(t.id)));
        }

        return suggestions.length > 0 ? suggestions.slice(0, 3) : allTemplates.slice(0, 3);
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