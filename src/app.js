// Galleria Studio Pro - Main Application
class GalleriaApp {
    constructor() {
        this.initialized = false;
        this.renderEngine = null;
        this.uiManager = uiManager;
        this.templateRenderer = templateRenderer;
    }

    async init() {
        console.log('🎨 Galleria Studio Pro - Initializing');

        // Initialize canvas engine
        this.renderEngine = new CanvasEngine('main-canvas');
        window.mainRenderer = this.renderEngine;

        // Setup rendering
        this._setupMainLayer();

        // Initialize UI
        this.uiManager.init();

        // Bind state changes to render
        this._bindStateToRender();

        // Start render loop
        this._startRenderLoop();

        this.initialized = true;
        console.log('✅ Galleria Studio Pro - Ready');
    }

    _setupMainLayer() {
        // Single comprehensive layer that renders complete scene
        this.renderEngine.createLayer('scene', {
            zIndex: 0,
            render: (ctx) => {
                const template = this._getCurrentTemplate();
                const artwork = appState.get('artwork');

                if (template && artwork.processedImage) {
                    // Full scene with artwork
                    this.templateRenderer.render(template, ctx.canvas, artwork.processedImage, {
                        scale: artwork.scale / 100, // Convert percentage to decimal
                        rotation: artwork.rotation,
                        position: artwork.position,
                        frame: appState.get('frame'),
                        lighting: appState.get('lighting')
                    });
                } else if (template) {
                    // Just template background
                    this._renderTemplateOnly(ctx, template);
                } else {
                    // Default dark background
                    ctx.fillStyle = '#0a0a0f';
                    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                }
            }
        });
    }

    _renderTemplateOnly(ctx, template) {
        const { width, height } = ctx.canvas;

        // Background
        if (template.scene.backgroundGradient) {
            const grad = ctx.createLinearGradient(0, 0, width, height);
            grad.addColorStop(0, template.scene.backgroundGradient.from);
            grad.addColorStop(1, template.scene.backgroundGradient.to);
            ctx.fillStyle = grad;
        } else {
            ctx.fillStyle = template.scene.background || '#1a1a1a';
        }
        ctx.fillRect(0, 0, width, height);

        // Floor
        if (template.scene.floor) {
            const floorHeight = height * 0.3;
            const floorY = height - floorHeight;
            const grad = ctx.createLinearGradient(0, floorY, 0, height);
            grad.addColorStop(0, template.scene.floor.color);
            grad.addColorStop(1, '#000');
            ctx.fillStyle = grad;
            ctx.fillRect(0, floorY, width, floorHeight);
        }
    }

    _bindStateToRender() {
        const renderTriggers = [
            'artwork.scale', 'artwork.rotation', 'artwork.position',
            'artwork.processedImage', 'frame', 'lighting', 'template.id'
        ];

        renderTriggers.forEach(path => {
            appState.subscribe(path, () => {
                this.renderEngine.requestRender();
            });
        });
    }

    _startRenderLoop() {
        const loop = () => {
            this.renderEngine.render();
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    _getCurrentTemplate() {
        const id = appState.get('template.id');
        return id ? TemplateLibrary.getById(id) : null;
    }

    exportScene(options) {
        return this.renderEngine.renderForExport(options);
    }
}

// Start app
document.addEventListener('DOMContentLoaded', () => {
    window.galleriaApp = new GalleriaApp();
    window.galleriaApp.init();
});

// Debug access
window.appState = appState;