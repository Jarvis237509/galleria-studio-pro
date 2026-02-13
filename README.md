# Galleria Studio Pro 🎨

**AI-powered artwork presentation engine with cinematic templates, realistic frame physics, and gallery-quality mockup generation.**

## Vision

Galleria Studio Pro creates outputs that look like luxury gallery photography, not generic product mockups.

## Core Workflow

1. **Upload Artwork** - AI automatically isolates, corrects perspective, enhances colors
2. **AI Analysis** - Scene matching AI suggests optimal templates based on color/mood
3. **Template Selection** - 20+ curated templates across 6 categories
4. **Frame Customization** - Realistic frame physics with depth, material simulation
5. **Lighting Control** - Directional lighting, mood presets, atmospheric effects
6. **Export** - Marketing, social, and print-ready packs

## Phase 1 Complete ✅

### Architecture
| Module | Purpose | Status |
|--------|---------|--------|
| State.js | Immutable state with undo/redo | ✅ |
| CanvasEngine.js | Multi-layer compositing | ✅ |
| TemplateLibrary.js | 20+ premium templates | ✅ |
| FrameSystem.js | Realistic frame physics | ✅ |
| LightingEngine.js | Key/fill/ambient + moods | ✅ |
| AIProcessor.js | Scene analysis | ✅ |
| ExportEngine.js | Multi-format export | ✅ |
| UIManager.js | Tabbed UI controls | ✅ |
| app.js | Main entry | ✅ |

### Templates (20 Built)
- **Gallery**: White Cube, Brutalist, Dark Spotlight, Floating Spotlight
- **Residential**: Modern Minimal, Scandinavian, Luxury Penthouse, Coastal
- **Artistic**: Floating Abstract, Floral, Gold & Marble, Smoke & Mist
- **Studio**: Clean White, Infinity Curve
- **Exhibition**: Gallery Wall, Exhibition Banner
- **Packaging**: Wrapped Tissue, Shipping Crate

### Features Working
- Drag & drop artwork upload
- Category-based template browser
- Frame style selection (8 styles)
- Frame width/depth/color controls
- Light position control
- Mood presets (5 moods)
- Artwork scale/rotation sliders
- AI processing pipeline stub
- Export modal structure

## Phase 2 ✅ COMPLETE (Rendering)
- Real-time canvas rendering with TemplateRenderer
- Export pack generation with 4 presets
- Multi-size exports (marketplace, social, portfolio, print)
- Watermark support
- Shadow rendering with FrameSystem

## Phase 3 ✅ COMPLETE (AI Integration)
- Background removal (client-side edge detection)
- Perspective correction (auto brightness/contrast)
- Color enhancement (saturation/vibrance)
- AI template suggestions based on artwork analysis

## Phase 4 ✅ COMPLETE (Professional)
- Undo/Redo with visual feedback
- 20+ keyboard shortcuts with help modal (Press ?)
- Project persistence (export/import JSON, auto-save)
- Batch processing (upload multiple artworks)
- Gallery view thumbnail switching

## Roadmap

See [ROADMAP.md](ROADMAP.md) for full project scope and tracking.

## Usage
1. Open `index.html` in browser
2. Upload artwork (drag/drop or click)
3. Select template category → template
4. Adjust frame, lighting, positioning
5. Export

**Repositories:**
- MVP: `Jarvis237509/galleria-studio`
- Pro: `Jarvis237509/galleria-studio-pro`