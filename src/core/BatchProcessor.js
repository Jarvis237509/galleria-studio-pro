class BatchProcessor {
    constructor() {
        this.artworks = [];
        this.activeIndex = -1;
    }

    // Upload multiple files
    async uploadBatch(files, options = {}) {
        const results = [];
        const total = files.length;
        
        for (let i = 0; i < total; i++) {
            const file = files[i];
            appState.set('ai.progress', (i / total) * 0.9);
            
            try {
                const result = await aiProcessor.analyzeArtwork(file, {
                    backgroundRemoval: options.backgroundRemoval ?? true,
                    perspectiveCorrection: options.perspectiveCorrection ?? true,
                    colorEnhancement: options.colorEnhancement ?? false
                });
                
                const artwork = {
                    id: crypto.randomUUID(),
                    name: file.name.replace(/\.[^/.]+$/, ''),
                    canvas: result.processedCanvas,
                    scale: 100,
                    rotation: 0,
                    position: { x: 0, y: 0 },
                    addedAt: new Date().toISOString()
                };
                
                results.push(artwork);
            } catch (err) {
                console.error('Failed to process:', file.name, err);
            }
        }
        
        // Add to collection
        this.artworks.push(...results);
        
        // Set first as active if none active
        if (this.activeIndex === -1 && this.artworks.length > 0) {
            this.setActive(0);
        }
        
        return results;
    }

    setActive(index) {
        if (index >= 0 && index < this.artworks.length) {
            this.activeIndex = index;
            const artwork = this.artworks[index];
            
            // Update app state with this artwork
            appState.batch({
                'artwork.sourceImage': null, // Can't store canvas in JSON
                'artwork.processedImage': artwork.canvas,
                'artwork.scale': artwork.scale,
                'artwork.rotation': artwork.rotation,
                'artwork.position': artwork.position
            });
            
            return artwork;
        }
        return null;
    }

    updateActive(updates) {
        if (this.activeIndex >= 0 && this.activeIndex < this.artworks.length) {
            const artwork = this.artworks[this.activeIndex];
            Object.assign(artwork, updates);
            
            // Sync back to state
            if (updates.scale !== undefined) appState.set('artwork.scale', updates.scale);
            if (updates.rotation !== undefined) appState.set('artwork.rotation', updates.rotation);
            if (updates.position !== undefined) appState.set('artwork.position', updates.position);
        }
    }

    remove(index) {
        if (index >= 0 && index < this.artworks.length) {
            this.artworks.splice(index, 1);
            
            // Adjust active index
            if (this.artworks.length === 0) {
                this.activeIndex = -1;
                appState.set('artwork.processedImage', null);
            } else if (this.activeIndex >= this.artworks.length) {
                this.setActive(this.artworks.length - 1);
            } else {
                this.setActive(this.activeIndex);
            }
        }
    }

    duplicate(index) {
        if (index >= 0 && index < this.artworks.length) {
            const original = this.artworks[index];
            const copy = {
                ...original,
                id: crypto.randomUUID(),
                name: `${original.name} (Copy)`,
                addedAt: new Date().toISOString()
            };
            this.artworks.splice(index + 1, 0, copy);
            return copy;
        }
        return null;
    }

    clear() {
        this.artworks = [];
        this.activeIndex = -1;
        appState.set('artwork.processedImage', null);
    }

    getArtworks() {
        return [...this.artworks];
    }

    getActiveIndex() {
        return this.activeIndex;
    }

    getActiveArtwork() {
        return this.activeIndex >= 0 ? this.artworks[this.activeIndex] : null;
    }
}

const batchProcessor = new BatchProcessor();